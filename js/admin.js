import { db } from "./firebase-config.js";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const tableBody = document.getElementById('adminMemberTable');
const memberModal = document.getElementById('memberModal');
const memberForm = document.getElementById('memberForm');
let allMembers = [];

const communityData = {
    "1": ["โนนชัย 1", "โนนชัย 2", "โนนชัย 3", "ดอนหญ้านาง 1", "ดอนหญ้านาง 2", "ดอนหญ้านาง 3", "หลังศูนย์ราชการ 1", "หลังศูนย์ราชการ 2", "เทพารักษ์ 1", "เทพารักษ์ 2", "เทพารักษ์ 3", "เทพารักษ์ 4", "เทพารักษ์ 5", "พัฒนาเทพารักษ์", "เจ้าพ่อเกษม", "เจ้าพ่อทองสุข", "บขส"],
    "2": ["หนองใหญ่ 1", "หนองใหญ่ 2", "หนองใหญ่ 3", "หนองใหญ่ 4", "บะขาม", "ศรีจันทร์ประชา", "นาคะประเวศน์", "คุ้มพระลับ", "ชัยณรงค์สามัคคี", "ธารทิพย์", "หน้า รพ.ศูนย์ฯ", "หลักเมือง", "บ้านเลขที่ 37", "ทุ่งเศรษฐี", "ศิริมงคล", "ศรีจันทร์พัฒนา", "มิตรสัมพันธ์1", "มิตรสัมพันธ์2", "ทุ่งสร้างพัฒนา", "โพธิบัลลังค์ทอง", "บ้านพัก ตชด", "หัวสะพานสัมพันธ์", "ชลประทาน", "เจ้าพ่อขุนภักดี", "ธนาคร", "คุ้มหนองคู", "ศรีจันทร์", "ตรีเทพนครขอนแก่น"],
    "3": ["บ้านตูม", "เมืองเก่า1", "เมืองเก่า2", "เมืองเก่า3", "เมืองเก่า4", "คุ้มวัดกลาง", "คุ้มวัดธาตุ", "หลังสนามกีฬา 1", "หลังสนามกีฬา 2", "แก่นนคร", "กศน", "โนนหนองวัด 1", "โนนหนองวัด 2", "โนนหนองวัด 3", "โนนหนองวัด 4", "หนองวัดพัฒนา", "คุ้มวุฒาราม", "โนนทัน 1", "โนนทัน 2", "โนนทัน 3", "โนนทัน 4", "โนนทัน 5", "โนนทัน 6", "โนนทัน 7", "โนนทัน 8", "โนนทัน 9", "การเคหะ", "เหล่านาดี 12", "พระนครศรีบริรักษ์", "พิมานชลร่วมใจพัฒนา", "ก้าวหน้านคร"],
    "4": ["สามเหลี่ยม 1", "สามเหลี่ยม 2", "สามเหลี่ยม 3", "สามเหลี่ยม 4", "สามเหลี่ยม 5", "ศรีฐาน 1", "ศรีฐาน 2", "ศรีฐาน 3", "ศรีฐาน 4", "หนองแวงตราชู 1", "หนองแวงตราชู 2", "หนองแวงตราชู 3", "หนองแวงตราชู 4", "คุ้มวัดป่าอดุลยาราม", "ไทยสมุทร", "เทคโนภาค", "ตะวันใหม่", "มิตรภาพ", "ตลาดต้นตาล", "พนักงานเทศบาล"]
};

const communitySelect = document.getElementById('memberCommunity');

window.handleZoneChange = () => {
    const zoneValue = document.getElementById('memberZone').value;
    populateCommunities(zoneValue);
};

function populateCommunities(zoneValue, selectedCommunity = "") {
    communitySelect.innerHTML = '<option value="">-- เลือกชุมชน --</option>';
    if (zoneValue && communityData[zoneValue]) {
        communityData[zoneValue].forEach(comm => {
            const isSelected = comm === selectedCommunity ? 'selected' : '';
            communitySelect.innerHTML += `<option value="${comm}" ${isSelected}>${comm}</option>`;
        });
    } else {
        communitySelect.innerHTML = '<option value="">-- กรุณาเลือกเขตก่อน --</option>';
    }
}

// ----------------------------------------------------
// ระบบนำเข้าข้อมูลผ่านไฟล์ Excel (.xlsx / .csv)
// ----------------------------------------------------
document.getElementById('excelUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        // ดึง Sheet แรก
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // แปลงเป็น JSON
        const json = XLSX.utils.sheet_to_json(worksheet);

        if(confirm(`พบข้อมูลสมาชิกจำนวน ${json.length} รายการ ต้องการนำเข้าสู่ฐานข้อมูลหรือไม่?\n(ข้อมูลที่มีรหัสเดิมจะถูกเขียนทับ)`)) {
            await importExcelToFirebase(json);
        }
        document.getElementById('excelUpload').value = ''; // เคลียร์ไฟล์
    };
    reader.readAsArrayBuffer(file);
});

async function importExcelToFirebase(data) {
    tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-indigo-600 font-bold animate-pulse text-lg">กำลังอัพโหลดข้อมูลเข้าสู่ระบบ กรุณารอสักครู่...</td></tr>';
    let count = 0;
    
    for(let row of data) {
        const name = row['ชื่อ สกุล'] || row['ชื่อ-สกุล'] || row['ชื่อ-นามสกุล'];
        if(!name) continue; 
        
        const mId = String(row['เลขสมาชิก'] || row['รหัสสมาชิก'] || (Date.now() + count));
        const memberData = {
            memberId: mId,
            name: name,
            zone: String(row['เขต'] || ''),
            community: String(row['ชุมชน'] || row['ชื่อชุมชน'] || ''),
            joinDate: String(row['วันที่สมัคร'] || ''),
            deposit: parseFloat(row['เงินฝาก'] || 0),
            withdraw: parseFloat(row['ถอนเงิน'] || 0),
            deduction: parseFloat(row['หักฌาปนกิจ'] || 0),
            balance: parseFloat(row['ยอดเงินคงเหลือ'] || 0),
            status: String(row['สถานะสมาชิก'] || row['สถานะ'] || 'ปกติ')
        };

        try {
            await setDoc(doc(db, "members", mId), memberData);
            count++;
        } catch(e) {
            console.error("Error adding doc:", e);
        }
    }
    alert(`อัพโหลดและอัพเดทข้อมูลสำเร็จจำนวน ${count} รายการ!`);
    fetchAdminMembers();
}
// ----------------------------------------------------

const depositInput = document.getElementById('deposit');
const withdrawInput = document.getElementById('withdraw');
const deductionInput = document.getElementById('deduction');
const balanceInput = document.getElementById('memberBalance');

function calculateBalance() {
    const d = parseFloat(depositInput.value) || 0;
    const w = parseFloat(withdrawInput.value) || 0;
    const ded = parseFloat(deductionInput.value) || 0;
    balanceInput.value = (d - w - ded).toFixed(2);
}

document.querySelectorAll('.calc-input').forEach(input => {
    input.addEventListener('input', calculateBalance);
});

async function fetchAdminMembers() {
    tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-gray-500 font-bold animate-pulse">กำลังโหลดข้อมูล...</td></tr>';
    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        tableBody.innerHTML = '';
        allMembers = [];
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-gray-400">ยังไม่มีข้อมูลสมาชิก</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            allMembers.push({ id: docSnap.id, ...data });
            renderRow({ id: docSnap.id, ...data });
        });
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function renderRow(member) {
    const statusClass = member.status === 'ปกติ' ? 'text-green-700 bg-green-100' : (member.status === 'พ้นสภาพ' ? 'text-red-700 bg-red-100' : 'text-gray-700 bg-gray-200');
    const commText = member.community ? `${member.community} (เขต ${member.zone})` : '-';

    const row = `
        <tr class="hover:bg-blue-50 transition-colors border-b border-gray-100">
            <td class="p-4 font-mono text-gray-600">${member.memberId || member.id}</td>
            <td class="p-4 font-bold text-gray-800">${member.name}</td>
            <td class="p-4 text-blue-600 text-xs">${commText}</td>
            <td class="p-4 text-gray-500 text-xs">${member.joinDate || '-'}</td>
            <td class="p-4 text-right text-green-600">${parseFloat(member.deposit || 0).toLocaleString()}</td>
            <td class="p-4 text-right text-red-500">${parseFloat(member.withdraw || 0).toLocaleString()}</td>
            <td class="p-4 text-right text-orange-500">${parseFloat(member.deduction || 0).toLocaleString()}</td>
            <td class="p-4 text-right font-bold text-blue-700">฿${parseFloat(member.balance || 0).toLocaleString()}</td>
            <td class="p-4 text-center">
                <span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass}">${member.status}</span>
            </td>
            <td class="p-4 text-center space-x-3">
                <button onclick="openModal('edit', '${member.id}')" class="text-blue-500 hover:text-blue-800 font-bold underline">แก้ไข</button>
                <button onclick="deleteMember('${member.id}')" class="text-red-400 hover:text-red-700 font-bold underline">ลบ</button>
            </td>
        </tr>
    `;
    tableBody.insertAdjacentHTML('beforeend', row);
}

window.openModal = (mode, id = null) => {
    document.getElementById('formMode').value = mode;

    if (mode === 'add') {
        document.getElementById('modalTitle').innerText = 'เพิ่มสมาชิกใหม่';
        memberForm.reset();
        document.getElementById('memberId').readOnly = false;
        document.getElementById('docId').value = '';
        populateCommunities(""); 
        calculateBalance();
    } else if (mode === 'edit') {
        document.getElementById('modalTitle').innerText = 'แก้ไขข้อมูลสมาชิก';
        const member = allMembers.find(m => m.id === id);
        if (member) {
            document.getElementById('docId').value = id;
            document.getElementById('memberId').value = member.memberId || id;
            document.getElementById('memberId').readOnly = true;
            document.getElementById('memberName').value = member.name;
            
            document.getElementById('memberZone').value = member.zone || '';
            populateCommunities(member.zone || '', member.community || '');

            document.getElementById('joinDate').value = member.joinDate || '';
            document.getElementById('deposit').value = member.deposit || 0;
            document.getElementById('withdraw').value = member.withdraw || 0;
            document.getElementById('deduction').value = member.deduction || 0;
            document.getElementById('memberBalance').value = member.balance || 0;
            document.getElementById('memberStatus').value = member.status;
        }
    }
    memberModal.classList.remove('hidden');
};

window.closeModal = () => {
    memberModal.classList.add('hidden');
};

memberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = document.getElementById('formMode').value;
    const docId = document.getElementById('docId').value;
    const mId = document.getElementById('memberId').value;
    
    calculateBalance();

    const data = {
        memberId: mId,
        name: document.getElementById('memberName').value,
        zone: document.getElementById('memberZone').value,
        community: document.getElementById('memberCommunity').value,
        joinDate: document.getElementById('joinDate').value,
        deposit: parseFloat(depositInput.value),
        withdraw: parseFloat(withdrawInput.value),
        deduction: parseFloat(deductionInput.value),
        balance: parseFloat(balanceInput.value),
        status: document.getElementById('memberStatus').value
    };

    try {
        if (mode === 'add') {
            await setDoc(doc(db, "members", mId), data);
            alert('เพิ่มสมาชิกสำเร็จ!');
        } else if (mode === 'edit') {
            await updateDoc(doc(db, "members", docId), data);
            alert('อัปเดตข้อมูลสำเร็จ!');
        }
        closeModal();
        fetchAdminMembers();
    } catch (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    }
});

window.deleteMember = async (id) => {
    if (confirm('ยืนยันการลบสมาชิกรายนี้?')) {
        try {
            await deleteDoc(doc(db, "members", id));
            fetchAdminMembers();
        } catch (error) {
            alert('ลบไม่สำเร็จ: ' + error.message);
        }
    }
};

document.getElementById('adminSearchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    tableBody.innerHTML = '';
    const filtered = allMembers.filter(m => 
        (m.name && m.name.toLowerCase().includes(term)) || 
        (m.memberId && m.memberId.toLowerCase().includes(term)) ||
        (m.community && m.community.toLowerCase().includes(term))
    );
    filtered.forEach(renderRow);
});

fetchAdminMembers();
