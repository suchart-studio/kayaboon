import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const memberListEl = document.getElementById('memberList');
const searchInput = document.getElementById('searchInput');

// 💡 ตัวแปรสำหรับ Pagination ฝั่ง User
let allMembers = [];
let filteredMembers = [];
let currentPage = 1;
const itemsPerPage = 50;

function calculateSummary(members) {
    let totalBalance = 0;
    let activeCount = 0;
    let inactiveCount = 0;

    members.forEach(m => {
        totalBalance += parseFloat(m.balance || 0);
        if (m.status === 'ปกติ') activeCount++;
        else inactiveCount++;
    });

    document.getElementById('summaryTotalBalance').innerText = '฿' + totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('summaryTotalMembers').innerText = members.length.toLocaleString();
    document.getElementById('summaryActive').innerText = activeCount.toLocaleString();
    document.getElementById('summaryInactive').innerText = inactiveCount.toLocaleString();
}

async function loadMembers() {
    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        
        if(querySnapshot.empty) {
            memberListEl.innerHTML = '<div class="text-center text-red-500 bg-red-50 p-4 rounded-xl">ไม่พบข้อมูลในระบบ</div>';
            document.getElementById('userPaginationControls').classList.add('hidden');
            return;
        }

        allMembers = [];
        querySnapshot.forEach((docSnap) => {
            allMembers.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        calculateSummary(allMembers);
        
        filteredMembers = [...allMembers];
        currentPage = 1;
        displayMembers();

    } catch (error) {
        console.error("Error loading documents: ", error);
        memberListEl.innerHTML = '<div class="text-center text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

// 💡 แสดงผลแบบคำนวณหน้า
function displayMembers() {
    memberListEl.innerHTML = '';
    const totalItems = filteredMembers.length;

    if (totalItems === 0) {
        memberListEl.innerHTML = '<div class="text-center text-gray-500 py-10">ไม่พบสมาชิกที่ค้นหา</div>';
        document.getElementById('userPaginationControls').classList.add('hidden');
        return;
    }

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const displayData = filteredMembers.slice(startIndex, endIndex);

    let htmlString = '';
    displayData.forEach(data => {
        const statusColor = data.status === 'ปกติ' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
        const zoneText = data.zone ? `(เขต ${data.zone})` : '';
        const commText = data.community || '-';

        htmlString += `
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="font-bold text-gray-800 text-base">${data.name || 'ไม่มีชื่อ'}</h3>
                        <p class="text-xs text-gray-400">รหัส: ${data.memberId || data.id}</p>
                        <p class="text-xs text-blue-600 mt-1">📍 ชุมชน${commText} ${zoneText}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] px-2 py-0.5 rounded-full ${statusColor}">${data.status || 'ไม่ระบุ'}</span>
                        <div class="text-[10px] text-gray-500 mt-1">ยอดเงินคงเหลือ</div>
                        <div class="font-bold text-xl text-blue-600 border-b border-blue-100 pb-1">฿${parseFloat(data.balance || 0).toLocaleString()}</div>
                    </div>
                </div>
                
                <div class="grid grid-cols-3 gap-2 text-center text-xs bg-gray-50 p-2 rounded-lg">
                    <div><p class="text-gray-500 mb-1">ฝากเงิน</p><p class="text-green-600 font-bold">฿${parseFloat(data.deposit || 0).toLocaleString()}</p></div>
                    <div class="border-l border-r border-gray-200"><p class="text-gray-500 mb-1">ถอนเงิน</p><p class="text-red-500 font-bold">฿${parseFloat(data.withdraw || 0).toLocaleString()}</p></div>
                    <div><p class="text-gray-500 mb-1">หักฌาปนกิจ</p><p class="text-orange-500 font-bold">฿${parseFloat(data.deduction || 0).toLocaleString()}</p></div>
                </div>
            </div>
        `;
    });

    memberListEl.innerHTML = htmlString;
    
    document.getElementById('userPaginationControls').classList.remove('hidden');
    document.getElementById('userPageInfo').innerText = `${currentPage} / ${totalPages}`;
}

// 💡 ฟังก์ชันเปลี่ยนหน้าสำหรับฝั่ง User
window.prevUserPage = () => {
    if (currentPage > 1) {
        currentPage--;
        displayMembers();
        window.scrollTo({ top: 250, behavior: 'smooth' }); // เลื่อนจอกลับไปข้างบนตารางนิดหน่อย
    }
};

window.nextUserPage = () => {
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayMembers();
        window.scrollTo({ top: 250, behavior: 'smooth' });
    }
};

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    
    if (term === '') {
        filteredMembers = [...allMembers];
    } else {
        filteredMembers = allMembers.filter(m => 
            (m.name && m.name.toLowerCase().includes(term)) || 
            (m.memberId && m.memberId.toLowerCase().includes(term)) ||
            (m.community && m.community.toLowerCase().includes(term))
        );
    }
    currentPage = 1;
    displayMembers();
});

loadMembers();
