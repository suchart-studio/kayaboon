import { db } from "./firebase-config.js";
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const tableBody = document.getElementById('adminMemberTable');
const memberModal = document.getElementById('memberModal');
const memberForm = document.getElementById('memberForm');

let allMembers = [];
let filteredMembers = [];

// ----------------------------------------------------
// ข้อมูลชุมชนที่ฝังอยู่ในระบบ
// ----------------------------------------------------
const communityData = {
    "0": ["พนักงานเทศบาล"],
    "1": ["โนนชัย 1", "โนนชัย 2", "โนนชัย 3", "ดอนหญ้านาง 1", "ดอนหญ้านาง 2", "ดอนหญ้านาง 3", "หลังศูนย์ราชการ 1", "หลังศูนย์ราชการ 2", "เทพารักษ์ 1", "เทพารักษ์ 2", "เทพารักษ์ 3", "เทพารักษ์ 4", "เทพารักษ์ 5", "พัฒนาเทพารักษ์", "เจ้าพ่อเกษม", "เจ้าพ่อทองสุข", "บขส"],
    "2": ["หนองใหญ่ 1", "หนองใหญ่ 2", "หนองใหญ่ 3", "หนองใหญ่ 4", "บ้านบะขาม", "ศรีจันทร์ประชา", "นาคะประเวศน์", "คุ้มพระลับ", "ชัยณรงค์-สามัคคี", "ธารทิพย์", "หน้า รพ.ศูนย์", "หลักเมือง", "บ้านเลขที่ 37", "ทุ่งเศรษฐี", "ศิริมงคล", "ศรีจันทร์พัฒนา", "มิตรสัมพันธ์ 1", "มิตรสัมพันธ์ 2", "ทุ่งสร้างพัฒนา", "โพธิบัลลังค์ทอง", "บ้านพัก ตชด", "หัวสะพานสัมพันธ์", "ชลประทาน", "โรงเรียนคลองดาวเหลือง", "ประชาสโมสร 1", "ประชาสโมสร 2"],
    "3": ["กสิกรสำราญ 1", "กสิกรสำราญ 2", "กสิกรสำราญ 3", "การเคหะ", "มิตรภาพ 1", "มิตรภาพ 2", "มิตรภาพ 3", "หนองแวงตราชู 1", "หนองแวงตราชู 2", "หนองแวงตราชู 3", "หนองแวงตราชู 4", "สามเหลี่ยม 1", "สามเหลี่ยม 2", "สามเหลี่ยม 3", "สามเหลี่ยม 4", "สามเหลี่ยม 5", "วุฒิพร", "หมู่บ้านภาภิรมย์"],
    "4": ["วัดหนองแวง", "โนนทัน 1", "โนนทัน 2", "โนนทัน 3", "โนนทัน 4", "โนนทัน 5", "โนนทัน 6", "โนนทัน 7", "โนนทัน 8", "โนนทัน 9", "บึงแก่นนคร", "หนองวัด 1", "หนองวัด 2", "หนองวัด 3", "หนองวัด 4", "ตูมบรรเทิง", "บ้านตูม", "เหล่านาดี 1", "เหล่านาดี 2", "การเคหะ 1", "การเคหะ 2", "การเคหะ 3", "หนองขาม 1", "หนองขาม 2", "พระลับประชารักษ์", "บ้านกอก-บ้านกอกน้อย"]
};

// ----------------------------------------------------
// ระบบ Login
// ----------------------------------------------------
const loginOverlay = document.getElementById('loginOverlay');
const adminContent = document.getElementById('adminContent');

if (sessionStorage.getItem('adminAuth') === 'true') {
    loginOverlay.classList.add('hidden');
    adminContent.classList.remove('hidden');
    fetchAdminMembers();
}

window.checkPassword = () => {
    if (document.getElementById('adminPassword').value === '987654321') {
        sessionStorage.setItem('adminAuth', 'true');
        loginOverlay.classList.add('hidden');
        adminContent.classList.remove('hidden');
        fetchAdminMembers();
    } else {
        alert('รหัสผ่านไม่ถูกต้อง');
    }
};

window.logout = () => {
    sessionStorage.removeItem('adminAuth');
    location.reload();
};

// ----------------------------------------------------
// จัดการข้อมูลสมาชิก
// ----------------------------------------------------
async function fetchAdminMembers() {
    const querySnapshot = await getDocs(collection(db, "members"));
    allMembers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    filteredMembers = [...allMembers];
    renderTable();
}

function renderTable() {
    tableBody.innerHTML = filteredMembers.map(m => `
        <tr class="hover:bg-slate-50 transition">
            <td class="p-4 font-bold text-slate-700">${m.memberId}</td>
            <td class="p-4 font-medium">${m.name}</td>
            <td class="p-4 text-xs text-slate-500">${m.community} (${m.zone})</td>
            <td class="p-4 text-right">฿${(m.deposit || 0).toLocaleString()}</td>
            <td class="p-4 text-right">฿${(m.trashIncome || 0).toLocaleString()}</td>
            <td class="p-4 text-right font-bold text-blue-600">฿${(m.balance || 0).toLocaleString()}</td>
            <td class="p-4 text-center space-x-1">
                <button onclick="openModal('${m.id}')" class="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200">แก้ไข</button>
                <button onclick="deleteMember('${m.id}')" class="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold hover:bg-red-200">ลบ</button>
            </td>
        </tr>
    `).join('');
}

window.openModal = (docId = null) => {
    memberForm.reset();
    document.getElementById('editId').value = '';
    document.getElementById('modalTitle').innerText = 'เพิ่มสมาชิกใหม่';
    
    if (docId) {
        const m = allMembers.find(x => x.id === docId);
        document.getElementById('editId').value = m.id;
        document.getElementById('memberId').value = m.memberId;
        document.getElementById('name').value = m.name;
        document.getElementById('zone').value = m.zone;
        updateCommunityOptions();
        document.getElementById('community').value = m.community;
        document.getElementById('deposit').value = m.deposit;
        document.getElementById('trashIncome').value = m.trashIncome;
        document.getElementById('deduction').value = m.deduction;
        
        // ฟิลด์ใหม่
        document.getElementById('ben1Name').value = m.ben1Name || '';
        document.getElementById('ben1Status').value = m.ben1Status || 'ยังไม่รับ';
        document.getElementById('ben2Name').value = m.ben2Name || '';
        document.getElementById('ben2Status').value = m.ben2Status || 'ยังไม่รับ';
        document.getElementById('ben3Name').value = m.ben3Name || '';
        document.getElementById('ben3Status').value = m.ben3Status || 'ยังไม่รับ';
        
        document.getElementById('rec1Name').value = m.rec1Name || '';
        document.getElementById('rec2Name').value = m.rec2Name || '';
        document.getElementById('rec3Name').value = m.rec3Name || '';

        calculateBalance();
        document.getElementById('modalTitle').innerText = 'แก้ไขข้อมูลสมาชิก';
    }
    memberModal.classList.remove('hidden');
};

window.closeModal = () => memberModal.classList.add('hidden');

window.updateCommunityOptions = () => {
    const zone = document.getElementById('zone').value;
    const commEl = document.getElementById('community');
    commEl.innerHTML = '<option value="">เลือกชุมชน</option>';
    if (communityData[zone]) {
        communityData[zone].forEach(c => {
            commEl.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }
};

window.calculateBalance = () => {
    const d = parseFloat(document.getElementById('deposit').value) || 0;
    const t = parseFloat(document.getElementById('trashIncome').value) || 0;
    const sub = parseFloat(document.getElementById('deduction').value) || 0;
    const balance = d + t - sub;
    document.getElementById('memberBalance').value = balance;
    
    const statusEl = document.getElementById('memberStatus');
    if (balance >= 300) {
        statusEl.value = 'ผ่านเกณฑ์';
        statusEl.className = 'w-1/3 p-2 text-center border-0 bg-transparent font-bold text-green-600';
    } else {
        statusEl.value = 'ไม่ผ่านเกณฑ์';
        statusEl.className = 'w-1/3 p-2 text-center border-0 bg-transparent font-bold text-red-500';
    }
};

memberForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const memberData = {
        memberId: document.getElementById('memberId').value,
        name: document.getElementById('name').value,
        zone: document.getElementById('zone').value,
        community: document.getElementById('community').value,
        deposit: parseFloat(document.getElementById('deposit').value),
        trashIncome: parseFloat(document.getElementById('trashIncome').value),
        deduction: parseFloat(document.getElementById('deduction').value),
        balance: parseFloat(document.getElementById('memberBalance').value),
        status: document.getElementById('memberStatus').value,
        
        ben1Name: document.getElementById('ben1Name').value,
        ben1Status: document.getElementById('ben1Status').value,
        ben2Name: document.getElementById('ben2Name').value,
        ben2Status: document.getElementById('ben2Status').value,
        ben3Name: document.getElementById('ben3Name').value,
        ben3Status: document.getElementById('ben3Status').value,
        
        rec1Name: document.getElementById('rec1Name').value,
        rec2Name: document.getElementById('rec2Name').value,
        rec3Name: document.getElementById('rec3Name').value
    };

    try {
        const docRef = id ? doc(db, "members", id) : doc(collection(db, "members"));
        await setDoc(docRef, memberData);
        closeModal();
        fetchAdminMembers();
    } catch (err) { alert("Error: " + err.message); }
};

window.deleteMember = async (id) => {
    if (confirm("ลบสมาชิกรายนี้ใช่หรือไม่?")) {
        await deleteDoc(doc(db, "members", id));
        fetchAdminMembers();
    }
};

document.getElementById('adminSearchInput').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    filteredMembers = allMembers.filter(m => 
        m.name.toLowerCase().includes(term) || 
        m.memberId.includes(term) || 
        m.community.toLowerCase().includes(term)
    );
    renderTable();
};
