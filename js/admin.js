import { db } from "./firebase-config.js";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const tableBody = document.getElementById('adminMemberTable');
const memberModal = document.getElementById('memberModal');
const memberForm = document.getElementById('memberForm');
let allMembers = [];

// ----------------------------------------------------
// ระบบ Auto-Calculate ยอดเงินคงเหลือ
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

// ผูก Event ให้คำนวณทุกครั้งที่พิมพ์
document.querySelectorAll('.calc-input').forEach(input => {
    input.addEventListener('input', calculateBalance);
});

// ----------------------------------------------------

async function fetchAdminMembers() {
    tableBody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-500 font-bold animate-pulse">กำลังโหลดข้อมูล...</td></tr>';
    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        tableBody.innerHTML = '';
        allMembers = [];
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-400">ยังไม่มีข้อมูลสมาชิก</td></tr>';
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
    const row = `
        <tr class="hover:bg-blue-50 transition-colors border-b border-gray-100">
            <td class="p-4 font-mono text-gray-600">${member.memberId || member.id}</td>
            <td class="p-4 font-bold text-gray-800">${member.name}</td>
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
        calculateBalance(); // ให้เป็น 0
    } else if (mode === 'edit') {
        document.getElementById('modalTitle').innerText = 'แก้ไขข้อมูลสมาชิก';
        const member = allMembers.find(m => m.id === id);
        if (member) {
            document.getElementById('docId').value = id;
            document.getElementById('memberId').value = member.memberId || id;
            document.getElementById('memberId').readOnly = true;
            document.getElementById('memberName').value = member.name;
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
    
    // คำนวณยอดสุดท้ายให้ชัวร์ก่อนเซฟ
    calculateBalance();

    const data = {
        memberId: mId,
        name: document.getElementById('memberName').value,
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
        (m.memberId && m.memberId.toLowerCase().includes(term))
    );
    filtered.forEach(renderRow);
});

fetchAdminMembers();
