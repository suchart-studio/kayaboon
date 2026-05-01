import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const form = document.getElementById('trashForm');
const communitySelect = document.getElementById('communitySelect');
const recordDate = document.getElementById('recordDate');
const saveBtn = document.getElementById('saveBtn');
const editIdInput = document.getElementById('editId');
const cancelEditBtn = document.getElementById('cancelEdit');
const tableBody = document.getElementById('trashRecordsTable');

const inputs = {
    glass: document.getElementById('valGlass'),
    paper: document.getElementById('valPaper'),
    plastic: document.getElementById('valPlastic'),
    metal: document.getElementById('valMetal'),
    other: document.getElementById('valOther')
};

// ข้อมูลชุมชนทั้งหมด
const communityData = {
    "0": ["พนักงานเทศบาล"],
    "1": ["โนนชัย 1", "โนนชัย 2", "โนนชัย 3", "ดอนหญ้านาง 1", "ดอนหญ้านาง 2", "ดอนหญ้านาง 3", "หลังศูนย์ราชการ 1", "หลังศูนย์ราชการ 2", "เทพารักษ์ 1", "เทพารักษ์ 2", "เทพารักษ์ 3", "เทพารักษ์ 4", "เทพารักษ์ 5", "พัฒนาเทพารักษ์", "เจ้าพ่อเกษม", "เจ้าพ่อทองสุข", "บขส"],
    "2": ["หนองใหญ่ 1", "หนองใหญ่ 2", "หนองใหญ่ 3", "หนองใหญ่ 4", "บ้านบะขาม", "ศรีจันทร์ประชา", "นาคะประเวศน์", "คุ้มพระลับ", "ชัยณรงค์-สามัคคี", "ธารทิพย์", "หน้า รพ.ศูนย์", "หลักเมือง", "บ้านเลขที่ 37", "ทุ่งเศรษฐี", "ศิริมงคล", "ศรีจันทร์พัฒนา", "มิตรสัมพันธ์ 1", "มิตรสัมพันธ์ 2", "ทุ่งสร้างพัฒนา", "โพธิบัลลังค์ทอง", "บ้านพัก ตชด", "หัวสะพานสัมพันธ์", "เจ้าพ่อขุนภักดี", "ธนาคร", "คุ้มหนองคู", "ศรีจันทร์", "ตรีเทพนครขอนแก่น"],
    "3": ["บ้านตูม", "เมืองเก่า 1", "เมืองเก่า 2", "เมืองเก่า 3", "เมืองเก่า 4", "คุ้มวัดกลาง", "คุ้มวัดธาตุ", "หลังสนามกีฬา 1", "หลังสนามกีฬา 2", "แก่นนคร", "กศน.", "โนนหนองวัด 1", "โนนหนองวัด 2", "โนนหนองวัด 3", "โนนหนองวัด 4", "หนองวัดพัฒนา", "คุ้มวุฒาราม", "โนนทัน1", "โนนทัน2", "โนนทัน3", "โนนทัน4", "โนนทัน5", "โนนทัน 6", "โนนทัน7", "โนนทัน8", "โนนทัน9", "การเคหะ", "เหล่านาดี12", "พระนครศรีบริรักษ์", "พิมานชลร่วมใจ", "95 ก้าวหน้านคร"],
    "4": ["สามเหลี่ยม 1", "สามเหลี่ยม 2", "สามเหลี่ยม 3", "สามเหลี่ยม 4", "สามเหลี่ยม 5", "ศรีฐาน 1", "ศรีฐาน 2", "ศรีฐาน 3", "ศรีฐาน 4", "หนองแวงตราชู 1", "หนองแวงตราชู 2", "หนองแวงตราชู 3", "หนองแวงตราชู 4", "คุ้มวัดป่าอดุลยาราม", "ไทยสมุทร", "เทคโนภาค", "ตะวันใหม่", "มิตรภาพ", "ตลาดต้นตาล"]
};

// ----------------------------------------------------
// ระบบเริ่มต้นทำงาน
// ----------------------------------------------------
window.initFirebaseSystem = () => {
    // ป้องกันการรันซ้ำซ้อน
    if (!recordDate.value) {
        recordDate.value = new Date().toISOString().split('T')[0];
        populateCommunities();
        loadRecords();
    }
};

// ถ้ารีเฟรชหน้าแล้วล็อกอินค้างอยู่ ให้โหลดข้อมูลเลย
if (sessionStorage.getItem('trashAuth') === 'true') {
    window.initFirebaseSystem();
}

// ----------------------------------------------------
// ฟังก์ชันดึงรายชื่อชุมชนใส่ตัวเลือก
// ----------------------------------------------------
function populateCommunities() {
    communitySelect.innerHTML = '<option value="">-- กรุณาเลือกชุมชน --</option>';
    let allCommunities = [];
    
    for (const zone in communityData) {
        allCommunities = allCommunities.concat(communityData[zone]);
    }
    
    allCommunities.sort().forEach(comm => {
        const option = document.createElement('option');
        option.value = comm;
        option.textContent = comm;
        communitySelect.appendChild(option);
    });
}

function calculateTotal() {
    let total = 0;
    Object.values(inputs).forEach(input => total += parseFloat(input.value || 0));
    document.getElementById('totalDisplay').innerText = total.toFixed(2);
}

Object.values(inputs).forEach(input => input.addEventListener('input', calculateTotal));

// ----------------------------------------------------
// จัดการตารางข้อมูล
// ----------------------------------------------------
async function loadRecords() {
    tableBody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-400">กำลังโหลดข้อมูล...</td></tr>';
    try {
        const q = query(collection(db, "trash_records"), orderBy("date", "desc"), limit(50));
        const snap = await getDocs(q);
        
        let html = '';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const id = docSnap.id;
            html += `
                <tr class="hover:bg-slate-50 border-b">
                    <td class="p-4 font-mono text-gray-500">${d.date}</td>
                    <td class="p-4 font-bold text-gray-800">${d.community}</td>
                    <td class="p-4 text-right">${(d.glass || 0).toFixed(2)}</td>
                    <td class="p-4 text-right">${(d.paper || 0).toFixed(2)}</td>
                    <td class="p-4 text-right">${(d.plastic || 0).toFixed(2)}</td>
                    <td class="p-4 text-right font-bold text-green-600 bg-green-50/50">${(d.total || 0).toFixed(2)}</td>
                    <td class="p-4 text-center">
                        <button onclick="editItem('${id}', ${JSON.stringify(d).replace(/"/g, '&quot;')})" class="text-blue-500 hover:text-blue-700 font-bold mr-2">แก้ไข</button>
                        <button onclick="deleteItem('${id}')" class="text-red-400 hover:text-red-600 font-bold">ลบ</button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html || '<tr><td colspan="7" class="p-8 text-center text-gray-400">ยังไม่มีข้อมูลการบันทึก</td></tr>';
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500">เกิดข้อผิดพลาด: ${error.message}</td></tr>`;
    }
}

window.editItem = (id, data) => {
    editIdInput.value = id;
    recordDate.value = data.date;
    communitySelect.value = data.community;
    inputs.glass.value = data.glass;
    inputs.paper.value = data.paper;
    inputs.plastic.value = data.plastic;
    inputs.metal.value = data.metal;
    inputs.other.value = data.other;
    
    calculateTotal();
    saveBtn.innerHTML = '🔄 อัปเดตข้อมูล';
    cancelEditBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteItem = async (id) => {
    if (confirm('ยืนยันการลบข้อมูลชุดนี้?')) {
        await deleteDoc(doc(db, "trash_records", id));
        loadRecords();
    }
};

cancelEditBtn.onclick = () => {
    form.reset();
    editIdInput.value = '';
    saveBtn.innerHTML = '💾 บันทึกข้อมูล';
    cancelEditBtn.classList.add('hidden');
    calculateTotal();
};

form.onsubmit = async (e) => {
    e.preventDefault();
    const id = editIdInput.value;
    const commVal = communitySelect.value;
    
    if (!commVal) {
        alert("กรุณาเลือกชุมชนก่อนบันทึก");
        return;
    }

    const data = {
        date: recordDate.value,
        community: commVal,
        glass: parseFloat(inputs.glass.value || 0),
        paper: parseFloat(inputs.paper.value || 0),
        plastic: parseFloat(inputs.plastic.value || 0),
        metal: parseFloat(inputs.metal.value || 0),
        other: parseFloat(inputs.other.value || 0),
        total: parseFloat(document.getElementById('totalDisplay').innerText),
        lastUpdate: serverTimestamp()
    };

    const btnOriginText = saveBtn.innerHTML;
    saveBtn.innerHTML = 'กำลังบันทึก...';
    saveBtn.disabled = true;

    try {
        if (id) {
            await updateDoc(doc(db, "trash_records", id), data);
            alert('อัปเดตข้อมูลสำเร็จ!');
        } else {
            await addDoc(collection(db, "trash_records"), data);
            alert('บันทึกข้อมูลสำเร็จ!');
        }
        
        cancelEditBtn.onclick(); 
        loadRecords(); 
    } catch (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
        saveBtn.innerHTML = btnOriginText;
        saveBtn.disabled = false;
    }
};
