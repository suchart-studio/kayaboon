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
        allMembers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        calculateSummary(allMembers);
        showSearchPrompt();
    } catch (error) {
        memberListEl.innerHTML = `<div class='text-center text-red-500'>Error loading: ${error.message}</div>`;
    }
}

function showSearchPrompt() {
    memberListEl.innerHTML = `
        <div class="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div class="text-4xl mb-3">🔍</div>
            <p class="text-gray-400 text-sm">กรุณากรอกชื่อหรือรหัสสมาชิกเพื่อค้นหา</p>
        </div>
    `;
}

function displayMembers() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pagedMembers = filteredMembers.slice(start, end);
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

    let htmlString = '';
    pagedMembers.forEach(m => {
        htmlString += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4 transition active:scale-[0.98]">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="text-[10px] text-gray-400 font-bold mb-0.5 uppercase tracking-tighter">MEMBER ID: ${m.memberId}</p>
                        <h3 class="text-lg font-bold text-slate-800">${m.name}</h3>
                        <p class="text-xs text-blue-600 font-medium">${m.community} (เขต ${m.zone})</p>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${m.status === 'ผ่านเกณฑ์' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}">
                        ${m.status}
                    </span>
                </div>

                <div class="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl">
                    <div class="text-center border-r border-slate-200">
                        <p class="text-[9px] text-slate-400 font-bold uppercase">เงินฝาก</p>
                        <p class="text-xs font-bold text-slate-700">฿${(m.deposit || 0).toLocaleString()}</p>
                    </div>
                    <div class="text-center border-r border-slate-200">
                        <p class="text-[9px] text-slate-400 font-bold uppercase">ขยะ</p>
                        <p class="text-xs font-bold text-slate-700">฿${(m.trashIncome || 0).toLocaleString()}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-[9px] text-slate-400 font-bold uppercase">คงเหลือ</p>
                        <p class="text-xs font-bold text-blue-600">฿${(m.balance || 0).toLocaleString()}</p>
                    </div>
                </div>

                <div class="mt-4 pt-3 border-t border-slate-100">
                    <p class="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">ตรวจสอบสถานะผู้รับสิทธิ์</p>
                    <div class="space-y-1.5">
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-slate-600">1. ${m.ben1Name || '-'}</span>
                            <span class="w-3.5 h-3.5 rounded-full border border-white shadow-sm ${m.ben1Status === 'รับแล้ว' ? 'bg-green-500' : 'bg-red-500'}"></span>
                        </div>
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-slate-600">2. ${m.ben2Name || '-'}</span>
                            <span class="w-3.5 h-3.5 rounded-full border border-white shadow-sm ${m.ben2Status === 'รับแล้ว' ? 'bg-green-500' : 'bg-red-500'}"></span>
                        </div>
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-slate-600">3. ${m.ben3Name || '-'}</span>
                            <span class="w-3.5 h-3.5 rounded-full border border-white shadow-sm ${m.ben3Status === 'รับแล้ว' ? 'bg-green-500' : 'bg-red-500'}"></span>
                        </div>
                    </div>
                </div>

                <div class="mt-3 pt-3 border-t border-dashed border-slate-200">
                    <p class="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">ลำดับผู้ที่จะได้รับเงิน</p>
                    <div class="text-xs space-y-1 text-slate-700">
                        <p><span class="inline-block w-4 h-4 bg-blue-100 text-blue-600 text-[10px] font-bold rounded text-center mr-1">1</span> ${m.rec1Name || '-'}</p>
                        <p><span class="inline-block w-4 h-4 bg-blue-100 text-blue-600 text-[10px] font-bold rounded text-center mr-1">2</span> ${m.rec2Name || '-'}</p>
                        <p><span class="inline-block w-4 h-4 bg-blue-100 text-blue-600 text-[10px] font-bold rounded text-center mr-1">3</span> ${m.rec3Name || '-'}</p>
                    </div>
                </div>
            </div>
        `;
    });

    memberListEl.innerHTML = htmlString;
    const pagEl = document.getElementById('userPaginationControls');
    if (totalPages > 1) {
        pagEl.classList.remove('hidden');
        document.getElementById('userPageInfo').innerText = `${currentPage} / ${totalPages}`;
    } else {
        pagEl.classList.add('hidden');
    }
}

// ... ส่วน Pagination และ Event Search (เหมือนเดิม) ...
window.prevUserPage = () => { if(currentPage > 1) { currentPage--; displayMembers(); window.scrollTo(0, 0); } };
window.nextUserPage = () => { if(currentPage < Math.ceil(filteredMembers.length/itemsPerPage)) { currentPage++; displayMembers(); window.scrollTo(0, 0); } };

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    if (!term) { filteredMembers = []; showSearchPrompt(); return; }
    filteredMembers = allMembers.filter(m => m.name.toLowerCase().includes(term) || m.memberId.includes(term));
    currentPage = 1;
    displayMembers();
});

loadMembers();
