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

// ข้อมูลชุมชน (Copy มาจาก report.js)
const communityData = { /* ... รายชื่อชุมชนเหมือนเดิม ... */ };

// เริ่มต้นหน้าจอ
function init() {
    recordDate.value = new Date().toISOString().split('T')[0];
    populateCommunities();
    loadRecords();
}

function populateCommunities() {
    // ... เหมือนโค้ดเดิม ...
}

// คำนวณน้ำหนักรวม
function calculateTotal() {
    let total = 0;
    Object.values(inputs).forEach(input => total += parseFloat(input.value || 0));
    document.getElementById('totalDisplay').innerText = total.toFixed(2);
}
Object.values(inputs).forEach(input => input.addEventListener('input', calculateTotal));

// ดึงข้อมูลมาแสดงในตาราง
async function loadRecords() {
    tableBody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-400">กำลังโหลด...</td></tr>';
    const q = query(collection(db, "trash_records"), orderBy("date", "desc"), limit(50));
    const snap = await getDocs(q);
    
    let html = '';
    snap.forEach(docSnap => {
        const d = docSnap.data();
        const id = docSnap.id;
        html += `
            <tr class="hover:bg-slate-50">
                <td class="p-4 font-mono">${d.date}</td>
                <td class="p-4 font-bold">${d.community}</td>
                <td class="p-4 text-right">${(d.glass || 0).toFixed(2)}</td>
                <td class="p-4 text-right">${(d.paper || 0).toFixed(2)}</td>
                <td class="p-4 text-right">${(d.plastic || 0).toFixed(2)}</td>
                <td class="p-4 text-right font-bold text-green-600">${(d.total || 0).toFixed(2)}</td>
                <td class="p-4 text-center">
                    <button onclick="editItem('${id}', ${JSON.stringify(d).replace(/"/g, '&quot;')})" class="text-blue-500 hover:underline mr-2">แก้ไข</button>
                    <button onclick="deleteItem('${id}')" class="text-red-500 hover:underline">ลบ</button>
                </td>
            </tr>
        `;
    });
    tableBody.innerHTML = html || '<tr><td colspan="7" class="p-4 text-center">ไม่มีข้อมูล</td></tr>';
}

// ฟังก์ชัน แก้ไข (ผูกกับ Window เพื่อให้เรียกจาก HTML ได้)
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

// ฟังก์ชัน ลบ
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
    const data = {
        date: recordDate.value,
        community: communitySelect.value,
        glass: parseFloat(inputs.glass.value || 0),
        paper: parseFloat(inputs.paper.value || 0),
        plastic: parseFloat(inputs.plastic.value || 0),
        metal: parseFloat(inputs.metal.value || 0),
        other: parseFloat(inputs.other.value || 0),
        total: parseFloat(document.getElementById('totalDisplay').innerText),
        lastUpdate: serverTimestamp()
    };

    if (id) {
        await updateDoc(doc(db, "trash_records", id), data);
        alert('อัปเดตสำเร็จ!');
    } else {
        await addDoc(collection(db, "trash_records"), data);
        alert('บันทึกสำเร็จ!');
    }
    
    cancelEditBtn.onclick(); // ล้างฟอร์ม
    loadRecords(); // โหลดตารางใหม่
};

init();
