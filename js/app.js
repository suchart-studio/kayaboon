import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const memberListEl = document.getElementById('memberList');
const searchInput = document.getElementById('searchInput');

let allMembers = [];
let filteredMembers = [];
let currentPage = 1;
const itemsPerPage = 50;

// ----------------------------------------------------
// ฟังก์ชันคำนวณสถานะสมาชิกแบบ 4 ระดับ (Real-time)
// ----------------------------------------------------
function getMemberStatus(balance, ben1, ben2, ben3, lastUpdate) {
    const bal = parseFloat(balance || 0);
    const claimedCount = [ben1, ben2, ben3].filter(s => s === 'รับแล้ว' || s === 'รับสิทธิ์แล้ว').length;
    
    if (claimedCount >= 3) {
        return { text: "รับสิทธิ์ครบแล้ว", class: "bg-blue-100 text-blue-700 border-blue-400" };
    }

    const dateToUse = lastUpdate || new Date().toISOString();
    const lastDate = new Date(dateToUse);
    const now = new Date();
    const diffTime = Math.abs(now - lastDate);
    const monthsPassed = diffTime / (1000 * 60 * 60 * 24 * 30.44); 

    if (bal >= 300) {
        if (monthsPassed <= 6) {
            return { text: "ยอดเยี่ยม", class: "bg-green-100 text-green-700 border-green-500" };
        } else {
            return { text: "ยอดเยี่ยม (ขาดอัปเดต)", class: "bg-emerald-50 text-emerald-600 border-emerald-300" };
        }
    } else { 
        if (monthsPassed > 6) {
            return { text: "สิ้นสภาพ", class: "bg-gray-200 text-gray-800 border-gray-500" };
        } else if (monthsPassed > 4) {
            return { text: "แย่แล้วล่ะ", class: "bg-red-100 text-red-700 border-red-500" };
        } else if (monthsPassed > 2) {
            return { text: "ยุ่งล่ะสิ", class: "bg-yellow-100 text-yellow-700 border-yellow-500" };
        } else {
            return { text: "ปกติ (กำลังสะสม)", class: "bg-sky-100 text-sky-700 border-sky-400" };
        }
    }
}

// ----------------------------------------------------
// คำนวณสรุปยอดด้านบนสุดของหน้า
// ----------------------------------------------------
function calculateSummary(members) {
    let totalBalance = 0;
    let activeCount = 0;
    let inactiveCount = 0;

    members.forEach(m => {
        const bal = parseFloat(m.balance || 0);
        totalBalance += bal;
        if (bal >= 300) activeCount++;
        else inactiveCount++;
    });

    document.getElementById('summaryTotalBalance').innerText = '฿' + totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('summaryTotalMembers').innerText = members.length.toLocaleString();
    document.getElementById('summaryActive').innerText = activeCount.toLocaleString();
    document.getElementById('summaryInactive').innerText = inactiveCount.toLocaleString();
}

// ----------------------------------------------------
// โหลดข้อมูลจาก Firebase
// ----------------------------------------------------
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
            <p class="text-gray-400 text-sm">พิมพ์ชื่อ เลขสมาชิก หรือชุมชนด้านบน<br>เพื่อค้นหาข้อมูลของคุณ</p>
        </div>
    `;
}

// ----------------------------------------------------
// แสดงผลการ์ดสมาชิก
// ----------------------------------------------------
function displayMembers() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pagedMembers = filteredMembers.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

    let htmlString = '';
    
    pagedMembers.forEach(m => {
        // ประเมินสถานะ 4 สีแบบ Real-time
        const statusData = getMemberStatus(m.balance, m.ben1Status, m.ben2Status, m.ben3Status, m.lastUpdate);
        
        // เช็คสีวงกลมสถานะรับสิทธิ์
        const getBenIcon = (status) => (status === 'รับแล้ว' || status === 'รับสิทธิ์แล้ว') ? 'bg-red-500' : 'bg-green-500';

        htmlString += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4 transition active:scale-[0.98]">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="text-[10px] text-gray-400 font-bold mb-0.5 uppercase tracking-tighter">รหัสสมาชิก: ${m.memberId || '-'}</p>
                        <h3 class="text-lg font-bold text-slate-800">${m.name}</h3>
                        <p class="text-xs text-blue-600 font-medium">${m.community || '-'} (เขต ${m.zone || '-'})</p>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${statusData.class}">
                        ${statusData.text}
                    </span>
                </div>

                <div class="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl mb-3">
                    <div class="text-center border-r border-slate-200">
                        <p class="text-[9px] text-slate-400 font-bold uppercase">เงินฝาก</p>
                        <p class="text-xs font-bold text-slate-700">฿${(parseFloat(m.deposit) || 0).toLocaleString()}</p>
                    </div>
                    <div class="text-center border-r border-slate-200">
                        <p class="text-[9px] text-slate-400 font-bold uppercase">ขยะรวม</p>
                        <p class="text-xs font-bold text-slate-700">฿${(parseFloat(m.trashIncome) || 0).toLocaleString()}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-[9px] text-slate-400 font-bold uppercase">หัก</p>
                        <p class="text-xs font-bold text-red-500">฿${(parseFloat(m.deduction) || 0).toLocaleString()}</p>
                    </div>
                </div>

                <div class="flex items-center justify-between bg-amber-50 border border-amber-100 p-2.5 rounded-lg mb-3">
                    <p class="text-xs font-bold text-amber-700">♻️ ประวัติขายขยะ (6 เดือน)</p>
                    <p class="text-sm font-bold text-amber-700">฿${(parseFloat(m.trash6Months) || 0).toLocaleString()}</p>
                </div>

                <div class="p-3 bg-blue-50/50 rounded-xl flex justify-between items-center">
                    <p class="text-xs font-bold text-gray-600">เงินคงเหลือสุทธิ</p>
                    <p class="text-xl font-bold text-blue-600">฿${(parseFloat(m.balance) || 0).toLocaleString()}</p>
                </div>

                <div class="mt-4 pt-3 border-t border-gray-100">
                    <div class="grid grid-cols-1 gap-4">
                        <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <p class="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider text-center">สถานะผู้รับสิทธิ์</p>
                            <div class="space-y-1.5">
                                <div class="flex justify-between items-center text-xs">
                                    <span class="text-gray-700">1. ${m.ben1Name || '-'}</span>
                                    <span class="w-3.5 h-3.5 rounded-full border border-white shadow-sm ${getBenIcon(m.ben1Status)}"></span>
                                </div>
                                <div class="flex justify-between items-center text-xs">
                                    <span class="text-gray-700">2. ${m.ben2Name || '-'}</span>
                                    <span class="w-3.5 h-3.5 rounded-full border border-white shadow-sm ${getBenIcon(m.ben2Status)}"></span>
                                </div>
                                <div class="flex justify-between items-center text-xs">
                                    <span class="text-gray-700">3. ${m.ben3Name || '-'}</span>
                                    <span class="w-3.5 h-3.5 rounded-full border border-white shadow-sm ${getBenIcon(m.ben3Status)}"></span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <p class="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider text-center">ลำดับผู้ที่จะได้รับเงิน</p>
                            <div class="text-xs space-y-1 text-gray-700">
                                <p><span class="inline-block w-4 h-4 bg-blue-100 text-blue-600 text-[10px] font-bold rounded text-center mr-1">1</span> ${m.rec1Name || '-'}</p>
                                <p><span class="inline-block w-4 h-4 bg-blue-100 text-blue-600 text-[10px] font-bold rounded text-center mr-1">2</span> ${m.rec2Name || '-'}</p>
                                <p><span class="inline-block w-4 h-4 bg-blue-100 text-blue-600 text-[10px] font-bold rounded text-center mr-1">3</span> ${m.rec3Name || '-'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 text-center">
                        <p class="text-[10px] text-gray-400">อัปเดตข้อมูลล่าสุด: ${m.lastUpdate ? new Date(m.lastUpdate).toLocaleDateString('th-TH') : 'ไม่มีบันทึก'}</p>
                    </div>
                </div>
            </div>
        `;
    });

    memberListEl.innerHTML = htmlString;
    
    // จัดการปุ่มหน้าถัดไป/ก่อนหน้า
    if (totalPages > 1) {
        document.getElementById('userPaginationControls').classList.remove('hidden');
        document.getElementById('userPageInfo').innerText = `${currentPage} / ${totalPages}`;
    } else {
        document.getElementById('userPaginationControls').classList.add('hidden');
    }
}

// ----------------------------------------------------
// ระบบแบ่งหน้า (Pagination)
// ----------------------------------------------------
window.prevUserPage = () => {
    if (currentPage > 1) {
        currentPage--;
        displayMembers();
        window.scrollTo({ top: 150, behavior: 'smooth' });
    }
};

window.nextUserPage = () => {
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayMembers();
        window.scrollTo({ top: 150, behavior: 'smooth' });
    }
};

// ----------------------------------------------------
// ระบบค้นหา
// ----------------------------------------------------
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    
    if (term === '') {
        filteredMembers = [];
        showSearchPrompt();
        document.getElementById('userPaginationControls').classList.add('hidden');
        return;
    }

    filteredMembers = allMembers.filter(m => 
        (m.name && m.name.toLowerCase().includes(term)) || 
        (m.memberId && String(m.memberId).toLowerCase().includes(term)) ||
        (m.community && m.community.toLowerCase().includes(term))
    );
    
    currentPage = 1;
    displayMembers();
});

// รันโหลดข้อมูลเมื่อเปิดหน้า
loadMembers();
