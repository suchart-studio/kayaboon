import { db } from "./firebase-config.js";
import { collection, getDocs, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const loginOverlay = document.getElementById('loginOverlay');
const trashContent = document.getElementById('trashContent');
const memberSearch = document.getElementById('memberSearch');
const searchResult = document.getElementById('searchResult');
const trashFormSection = document.getElementById('trashFormSection');

// ----------------------------------------------------
// 1. ระบบรักษาความปลอดภัย (Password Protection)
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('trashAuth') === 'true') {
        showContent();
    }
});

window.checkTrashPassword = () => {
    const pwd = document.getElementById('trashPassword').value;
    if (pwd === '987654321') {
        sessionStorage.setItem('trashAuth', 'true');
        showContent();
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
};

function showContent() {
    loginOverlay.classList.add('hidden');
    trashContent.classList.remove('hidden');
    loadMemberList(); // โหลดรายชื่อไว้สำหรับค้นหา
}

window.logoutTrash = () => {
    sessionStorage.removeItem('trashAuth');
    location.reload();
};

// ----------------------------------------------------
// 2. ระบบค้นหาสมาชิก
// ----------------------------------------------------
let members = [];

async function loadMemberList() {
    const snap = await getDocs(collection(db, "members"));
    members = [];
    snap.forEach(d => members.push({ id: d.id, ...d.data() }));
}

memberSearch.addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    if (term.length < 2) {
        searchResult.classList.add('hidden');
        trashFormSection.classList.add('hidden');
        return;
    }

    const found = members.find(m => 
        (m.name && m.name.toLowerCase().includes(term)) || 
        (m.memberId && m.memberId.toString().includes(term))
    );

    if (found) {
        searchResult.innerHTML = `
            <div class="p-4 bg-green-50 rounded-2xl border border-green-200">
                <p class="text-[10px] font-bold text-green-500 uppercase">พบข้อมูลสมาชิก</p>
                <h4 class="text-lg font-bold text-gray-800">${found.name}</h4>
                <p class="text-xs text-gray-500">รหัส: ${found.memberId} | ชุมชน: ${found.community || '-'}</p>
            </div>
        `;
        searchResult.classList.remove('hidden');
        trashFormSection.classList.remove('hidden');
        document.getElementById('selectedMemberId').value = found.id;
    } else {
        searchResult.innerHTML = `<p class="text-center text-sm text-red-500 py-2">ไม่พบสมาชิกชื่อนี้</p>`;
        searchResult.classList.remove('hidden');
        trashFormSection.classList.add('hidden');
    }
});

// ----------------------------------------------------
// 3. ระบบบันทึกข้อมูลลง Firebase
// ----------------------------------------------------
document.getElementById('trashEntryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const docId = document.getElementById('selectedMemberId').value;
    const price = parseFloat(document.getElementById('price').value) || 0;
    const btn = document.getElementById('btnSubmitTrash');
    const btnText = document.getElementById('btnText');

    if (!docId || price <= 0) return alert('ข้อมูลไม่ถูกต้อง');

    try {
        btn.disabled = true;
        btnText.innerText = "กำลังบันทึก...";

        const memberRef = doc(db, "members", docId);
        
        // อัปเดตยอดเงินสะสมอัตโนมัติ
        await updateDoc(memberRef, {
            trashIncome: increment(price),   // ขยะสะสมรวมเพิ่มขึ้น
            balance: increment(price),       // ยอดคงเหลือเพิ่มขึ้น
            trash6Months: increment(price),  // ประวัติขยะ 6 เดือนเพิ่มขึ้น
            lastUpdate: new Date().toISOString() // อัปเดตเวลาล่าสุด (เพื่อให้สถานะเป็นสีเขียว)
        });

        alert('บันทึกสำเร็จ! ยอดเงินถูกโอนเข้าบัญชีสมาชิกแล้ว');
        
        // ล้างฟอร์ม
        document.getElementById('trashEntryForm').reset();
        memberSearch.value = '';
        searchResult.classList.add('hidden');
        trashFormSection.classList.add('hidden');
        loadMemberList(); // รีโหลดข้อมูลล่าสุด

    } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
        btn.disabled = false;
        btnText.innerText = "ยืนยันบันทึกยอดเงินขยะ";
    }
});
