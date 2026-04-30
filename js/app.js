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
            memberListEl.innerHTML = '<div class="text-center text-red-500 bg-red-50 p-4 rounded-xl border border-red-100">ยังไม่มีข้อมูลในระบบ</div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            allMembers.push({ id: doc.id, ...doc.data() });
        });

        calculateSummary(allMembers);
        showSearchPrompt();
    } catch (error) {
        memberListEl.innerHTML = `<div class='text-center text-red-500 bg-red-50 p-4 rounded-xl'>เกิดข้อผิดพลาด: ${error.message}</div>`;
    }
}

function showSearchPrompt() {
    memberListEl.innerHTML = `
        <div class="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div class="text-4xl mb-3">🔍</div>
            <p class="text-gray-400 text-sm">พิมพ์ชื่อหรือรหัสสมาชิกด้านบน เพื่อค้นหา</p>
        </div>
    `;
}

function displayMembers() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pagedMembers = filteredMembers.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

    let htmlString = '';
    
    pagedMembers.forEach(m => {
        const statusClass = m.status === 'ผ่านเกณฑ์' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200';
        
        htmlString += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4 transition active:scale-[0.98]">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="text-[10px] text-gray-400 font-bold mb-0.5 uppercase tracking-tighter">รหัสสมาชิก: ${m.memberId}</p>
                        <h3 class="text-lg font-bold text-slate-800">${m.name}</h3>
                        <p class="text-xs text-blue-600 font-medium">${m.community} (เขต ${m.zone})</p>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${statusClass}">
                        ${m.status}
                    </span>
                </div>

                <div class="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl mb-3">
                    <div class="text-center border-r border-slate-200">
                        <p class="text-[9px] text-slate-400 font-bold uppercase">เงินฝาก</p>
                        <p class="text-xs font-bold text-slate-700">฿${(m.deposit || 0).toLocaleString()}</p>
                    </div>
                    <div class="text-center border-r border-slate-200">
                        <p class="text-[9px] text-slate-400 font-bold uppercase">ขยะรวม</p>
                        <p class="text-xs font-bold text-slate-700">฿${(m.trashIncome || 0).toLocaleString()}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-[9px] text-slate-400 font-bold uppercase">หัก</p>
                        <p class="text-xs font-bold text-red-500">฿${(m.deduction || 0).toLocaleString()}</p>
                    </div>
                </div>

                <div class="flex items-center justify-between bg-amber-50 border border-amber-100 p-2.5 rounded-lg mb-3">
                    <p class="text-xs font-bold text-amber-700">♻️ ประวัติขายขยะ (6 เดือน)</p>
                    <p class="text-sm font-bold text-amber-700">฿${(parseFloat(m.trash6Months) || 0).toLocaleString()}</p>
                </div>

                <div class="p-3 bg-blue-50/50 rounded-xl flex justify-between items-center">
                    <p class="text-xs font-bold text-gray-600">เงินคงเหลือสุทธิ</p>
                    <p class="text-xl font-bold text-blue-600">฿${(m.balance || 0).toLocaleString()}</p>
                </div>

                <div class="mt-4 pt-3 border-t border-gray-100">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p class="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">สถานะผู้รับสิทธิ์ (3 ท่าน)</p>
                            <div class="space-y-1.5">
                                <div class="flex justify-between items-center text-xs">
                                    <span class="text-gray-700">1. ${m.ben1Name || '-'}</span>
                                    <span class="w-3.5 h-3.5 rounded-full border border-white shadow-sm ${m.ben1Status === 'รับแล้ว' ? 'bg-red-500' : 'bg-green-500'}"></span>
                                </div>
                                <div class="flex justify-between items-center text-xs">
                                    <span class="text-gray-700">2. ${m.ben2Name || '-'}</span>
                                    <span class="w-3.5 h-3.5 rounded-full border border-white shadow-sm ${m.ben2Status === 'รับแล้ว' ? 'bg-red-500' : 'bg-green-500'}"></span>
                                </div>
                                <div class="flex justify-between items-center text-xs">
                                    <span class="text-gray-700">3. ${m.ben3Name || '-'}</span>
                                    <span class="w-3.5 h-3.5 rounded-full border border-white shadow-sm ${m.ben3Status === 'รับแล้ว' ? 'bg-red-500' : 'bg-green-500'}"></span>
                                </div>
                            </div>
                        </div>
                        <div class="pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-dashed border-gray-200 md:pl-4">
                            <p class="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">ลำดับผู้ที่จะได้รับเงิน</p>
                            <div class="text-xs space-y-1 text-gray-700">
                                <p><span class="inline-block w-4 h-4 bg-blue-100 text-blue-600 text-[10px] font-bold rounded text-center mr-1">1</span> ${m.rec1Name || '-'}</p>
                                <p><span class="inline-block w-4 h-4 bg-blue-100 text-blue-600 text-[10px] font-bold rounded text-center mr-1">2</span> ${m.rec2Name || '-'}</p>
                                <p><span class="inline-block w-4 h-4 bg-blue-100 text-blue-600 text-[10px] font-bold rounded text-center mr-1">3</span> ${m.rec3Name || '-'}</p>
                            </div>
                        </div>
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
