import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const memberListEl = document.getElementById('memberList');
const searchInput = document.getElementById('searchInput');

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
        if (m.status === 'ผ่านเกณฑ์') activeCount++;
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
        showSearchPrompt();

    } catch (error) {
        console.error("Error loading documents: ", error);
        memberListEl.innerHTML = '<div class="text-center text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

function showSearchPrompt() {
    memberListEl.innerHTML = `
        <div class="text-center text-gray-500 py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
            <span class="text-3xl">👆</span>
            <p class="mt-3 text-sm">โปรดพิมพ์ <b>ชื่อ, เลขสมาชิก</b> หรือ <b>ชุมชน</b></p>
            <p class="text-sm">ในช่องค้นหาด้านบนเพื่อดูข้อมูลสมาชิก</p>
        </div>`;
    document.getElementById('userPaginationControls').classList.add('hidden');
}

function displayMembers() {
    memberListEl.innerHTML = '';
    const totalItems = filteredMembers.length;

    if (totalItems === 0) {
        memberListEl.innerHTML = '<div class="text-center text-gray-500 py-10 bg-white rounded-2xl shadow-sm border border-gray-100">ไม่พบข้อมูลสมาชิกที่ค้นหา</div>';
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
        const isPassed = data.status === 'ผ่านเกณฑ์';
        const statusColor = isPassed ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
        
        // เช็คเงื่อนไขย่อยเพื่อแสดงเครื่องหมายถูก/ผิด ให้ชาวบ้านดู
        const cond1 = parseFloat(data.balance || 0) >= 300;
        const cond2 = parseFloat(data.trash6Months || 0) > 0;
        const cond3 = (data.benefitStatus || 'ยังไม่รับสิทธิ์') === 'ยังไม่รับสิทธิ์';

        const zoneText = data.zone ? `(เขต ${data.zone})` : '';
        const commText = data.community || '-';

        htmlString += `
            <div class="bg-white p-4 rounded-2xl shadow-sm border ${isPassed ? 'border-green-200' : 'border-gray-200'} relative mb-4">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="font-bold text-gray-800 text-lg">${data.name || 'ไม่มีชื่อ'}</h3>
                        <p class="text-xs text-gray-400">รหัส: ${data.memberId || data.id}</p>
                        <p class="text-xs text-blue-600 mt-1">📍 ชุมชน${commText} ${zoneText}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs px-3 py-1 rounded-full font-bold ${statusColor}">${data.status || 'ไม่ระบุ'}</span>
                        <div class="text-[10px] text-gray-500 mt-2">ยอดเงินคงเหลือ</div>
                        <div class="font-bold text-2xl text-blue-600">฿${parseFloat(data.balance || 0).toLocaleString()}</div>
                    </div>
                </div>

                <div class="bg-gray-50 p-2 rounded-lg mb-3 border border-gray-100">
                    <p class="text-[10px] text-gray-500 font-bold mb-1 border-b pb-1">เงื่อนไขการผ่านเกณฑ์:</p>
                    <ul class="text-[11px] space-y-1">
                        <li class="${cond1 ? 'text-green-600' : 'text-red-500'}">
                            ${cond1 ? '✅' : '❌'} ยอดเงินคงเหลือ 300 บ. ขึ้นไป
                        </li>
                        <li class="${cond2 ? 'text-green-600' : 'text-red-500'}">
                            ${cond2 ? '✅' : '❌'} มีประวัติขายขยะ 6 เดือน (฿${parseFloat(data.trash6Months || 0).toLocaleString()})
                        </li>
                        <li class="${cond3 ? 'text-green-600' : 'text-red-500'}">
                            ${cond3 ? '✅' : '❌'} สถานะ: ${data.benefitStatus || 'ยังไม่รับสิทธิ์'}
                        </li>
                    </ul>
                </div>
                
                <div class="grid grid-cols-4 gap-1 text-center text-[10px] sm:text-xs bg-gray-50 p-2 rounded-lg">
                    <div>
                        <p class="text-gray-500 mb-1">ฝากเงิน</p>
                        <p class="text-green-600 font-bold">฿${parseFloat(data.deposit || 0).toLocaleString()}</p>
                    </div>
                    <div class="border-l border-gray-200">
                        <p class="text-gray-500 mb-1">ขายขยะสะสม</p>
                        <p class="text-indigo-600 font-bold">฿${parseFloat(data.trashIncome || 0).toLocaleString()}</p>
                    </div>
                    <div class="border-l border-gray-200">
                        <p class="text-gray-500 mb-1">ถอนเงิน</p>
                        <p class="text-red-500 font-bold">฿${parseFloat(data.withdraw || 0).toLocaleString()}</p>
                    </div>
                    <div class="border-l border-gray-200">
                        <p class="text-gray-500 mb-1">หักฌาปนกิจ</p>
                        <p class="text-orange-500 font-bold">฿${parseFloat(data.deduction || 0).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `;
    });

    memberListEl.innerHTML = htmlString;
    
    if (totalPages > 1) {
        document.getElementById('userPaginationControls').classList.remove('hidden');
        document.getElementById('userPageInfo').innerText = `${currentPage} / ${totalPages}`;
    } else {
        document.getElementById('userPaginationControls').classList.add('hidden');
    }
}

window.prevUserPage = () => {
    if (currentPage > 1) {
        currentPage--;
        displayMembers();
        window.scrollTo({ top: 250, behavior: 'smooth' });
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
        filteredMembers = [];
        showSearchPrompt();
        return;
    }

    filteredMembers = allMembers.filter(m => 
        (m.name && m.name.toLowerCase().includes(term)) || 
        (m.memberId && m.memberId.toLowerCase().includes(term)) ||
        (m.community && m.community.toLowerCase().includes(term))
    );
    
    currentPage = 1;
    displayMembers();
});

loadMembers();
