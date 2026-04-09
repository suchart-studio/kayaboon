import { db } from "./firebase-config.js";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const tableBody = document.getElementById('adminMemberTable');
const memberModal = document.getElementById('memberModal');
const memberForm = document.getElementById('memberForm');
let allMembers = [];

// ดึงข้อมูล
async function fetchAdminMembers() {
    tableBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500 font-bold animate-pulse">กำลังโหลดข้อมูล...</td></tr>';
    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        tableBody.innerHTML = '';
        allMembers = [];
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">ยังไม่มีข้อมูลสมาชิก</td></tr>';
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

// สร้างแถวตาราง
function renderRow(member) {
    const statusClass = member.status === 'ปกติ' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100';
    const row = `
        <tr class="hover:bg-blue-50 transition-colors border-b border-gray-100">
            <td class="p-4 font-mono text-gray-600">${member.memberId || member.id}</td>
            <td class="p-4 font-bold text-gray-800 text-base">${member.name}</td>
            <td class="p-4 text-center">
                <span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass}">${member.status}</span>
            </td>
            <td class="p-4 text-right font-bold text-blue-700 text-base">฿${parseFloat(member.balance).toLocaleString()}</td>
            <td class="p-4 text-center space-x-3">
                <button onclick="openModal('edit', '${member.id}')" class="text-blue-500 hover:text-blue-800 font-bold underline">แก้ไข</button>
                <button onclick="deleteMember('${member.id}')" class="text-red-400 hover:text-red-700 font-bold underline">ลบ</button>
            </td>
        </tr>
    `;
    tableBody.insertAdjacentHTML('beforeend', row);
}

// ควบคุม Modal
window.openModal = (mode, id = null) => {
    const modeInput = document.getElementById('formMode');
    modeInput.value = mode;

    if (mode === 'add') {
        document.getElementById('modalTitle').innerText = 'เพิ่มสมาชิกใหม่';
        memberForm.reset();
        document.getElementById('memberId').readOnly = false;
        document.getElementById('docId').value = '';
    } else if (mode === 'edit') {
        document.getElementById('modalTitle').innerText = 'แก้ไขข้อมูลสมาชิก';
        const member = allMembers.find(m => m.id === id);
        if (member) {
            document.getElementById('docId').value = id;
            document.getElementById('memberId').value = member.memberId || id;
            document.getElementById('memberId').readOnly = true; // ห้ามแก้รหัสตอน edit
            document.getElementById('memberName').value = member.name;
            document.getElementById('memberStatus').value = member.status;
            document.getElementById('memberBalance').value = member.balance;
        }
    }
    memberModal.classList.remove('hidden');
};

window.closeModal = () => {
    memberModal.classList.add('hidden');
};

// บันทึกฟอร์ม (Add หรือ Edit)
memberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = document.getElementById('formMode').value;
    const docId = document.getElementById('docId').value;
    const mId = document.getElementById('memberId').value;
    
    const data = {
        memberId: mId,
        name: document.getElementById('memberName').value,
        status: document.getElementById('memberStatus').value,
        balance: parseFloat(document.getElementById('memberBalance').value)
    };

    try {
        if (mode === 'add') {
            // ใช้ รหัสสมาชิก เป็น Document ID เลย
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

// ลบ
window.deleteMember = async (id) => {
    if (confirm('ยืนยันการลบสมาชิกรายนี้?\n(ข้อมูลจะไม่สามารถกู้คืนได้)')) {
        try {
            await deleteDoc(doc(db, "members", id));
            fetchAdminMembers();
        } catch (error) {
            alert('ลบไม่สำเร็จ: ' + error.message);
        }
    }
};

// ค้นหา (Admin)
document.getElementById('adminSearchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    tableBody.innerHTML = '';
    const filtered = allMembers.filter(m => 
        (m.name && m.name.toLowerCase().includes(term)) || 
        (m.memberId && m.memberId.toLowerCase().includes(term))
    );
    filtered.forEach(renderRow);
});

fetchAdminMembers();