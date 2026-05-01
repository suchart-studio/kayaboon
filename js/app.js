import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const memberListEl = document.getElementById('memberList');
const searchInput = document.getElementById('searchInput');

let allMembers = [];
let filteredMembers = [];
let currentPage = 1;
const itemsPerPage = 50;

// ----------------------------------------------------
// ฟังก์ชันคำนวณสถานะสมาชิกแบบ 4 ระดับ (รองรับผู้รับสิทธิ์ 6 คน)
// ----------------------------------------------------
function getMemberStatus(balance, ben1, ben2, ben3, ben4, ben5, ben6, lastUpdate) {
    const bal = parseFloat(balance || 0);
    const claimedCount = [ben1, ben2, ben3, ben4, ben5, ben6].filter(s => s === 'รับแล้ว' || s === 'รับสิทธิ์แล้ว').length;
    
    if (claimedCount >= 6) {
        return { text: "รับสิทธิ์ครบแล้ว", class: "bg-blue-100 text-blue-700 border-blue-400" };
    }

    const dateToUse = lastUpdate || new Date().toISOString();
    const lastDate = new Date(dateToUse);
    const now = new Date();
    const monthsPassed = Math.abs(now - lastDate) / (1000 * 60 * 60 * 24 * 30.44); 

    if (bal >= 300) {
        return monthsPassed <= 6 ? { text: "ยอดเยี่ยม", class: "bg-green-100 text-green-700 border-green-500" } : { text: "ยอดเยี่ยม (ขาดอัปเดต)", class: "bg-emerald-50 text-emerald-600 border-emerald-300" };
    } else { 
        if (monthsPassed > 6) return { text: "สิ้นสภาพ", class: "bg-gray-200 text-gray-800 border-gray-500" };
        if (bal < 0) return { text: "แย่แล้ว", class: "bg-red-100 text-red-700 border-red-500" };
        return { text: "ยุ่งล่ะสิ", class: "bg-orange-100 text-orange-700 border-orange-500" };
    }
}

// ----------------------------------------------------
// 🌟 คำนวณสรุปยอดด้านบนสุดของหน้า (แยก 4 สถานะชัดเจน)
// ----------------------------------------------------
function calculateSummary(members) {
    let totalBalance = 0;
    let activeCount = 0;    // ยอดเยี่ยม / ปกติ
    let warningCount = 0;   // ยุ่งล่ะสิ
    let badCount = 0;       // แย่แล้ว
    let inactiveCount = 0;  // สิ้นสภาพ

    members.forEach(m => {
        const bal = parseFloat(m.balance || 0);
        totalBalance += bal;
        
        const stat = getMemberStatus(m.balance, m.ben1Status, m.ben2Status, m.ben3Status, m.ben4Status, m.ben5Status, m.ben6Status, m.lastUpdate);
        const text = stat.text;

        if (text.includes("ยอดเยี่ยม") || text.includes("ปกติ") || text.includes("รับสิทธิ์")) {
            activeCount++;
        } else if (text.includes("ยุ่งล่ะสิ")) {
            warningCount++;
        } else if (text.includes("แย่แล้ว")) {
            badCount++;
        } else if (text.includes("สิ้นสภาพ")) {
            inactiveCount++;
        }
    });

    // นำตัวเลขไปแสดงใน HTML
    const elTotalBal = document.getElementById('summaryTotalBalance');
    if (elTotalBal) {
        elTotalBal.innerText = '฿' + totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryTotalMembers').innerText = members.length.toLocaleString();
        
        document.getElementById('summaryActive').innerText = activeCount.toLocaleString();
        if (document.getElementById('summaryWarning')) document.getElementById('summaryWarning').innerText = warningCount.toLocaleString();
        if (document.getElementById('summaryBad')) document.getElementById('summaryBad').innerText = badCount.toLocaleString();
        if (document.getElementById('summaryInactive')) document.getElementById('summaryInactive').innerText = inactiveCount.toLocaleString();
    }
}

// ----------------------------------------------------
// โหลดข้อมูลจาก Firebase
// ----------------------------------------------------
async function loadMembers() {
    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        
        if(querySnapshot.empty) {
            memberListEl.innerHTML = '<div class="text-center text-red-500 bg-red-50 p-4 rounded-xl border border-red-100 text-lg">ยังไม่มีข้อมูลในระบบ</div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            allMembers.push({ id: doc.id, ...doc.data() });
        });

        calculateSummary(allMembers);
        showSearchPrompt();
    } catch (error) {
        memberListEl.innerHTML = `<div class='text-center text-red-500 bg-red-50 p-4 rounded-xl text-lg'>เกิดข้อผิดพลาด: ${error.message}</div>`;
    }
}

function showSearchPrompt() {
    memberListEl.innerHTML = `
        <div class="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div class="text-5xl mb-4">🔍</div>
            <p class="text-gray-500 text-base font-medium">พิมพ์ชื่อ เลขสมาชิก หรือชุมชน<br>เพื่อค้นหาข้อมูลของคุณ</p>
        </div>
    `;
}

// ----------------------------------------------------
// ฟังก์ชันแสดงผลการ์ดสมาชิก
// ----------------------------------------------------
function displayMembers() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pagedMembers = filteredMembers.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

    let htmlString = '';
    
    pagedMembers.forEach(m => {
        const statusData = getMemberStatus(m.balance, m.ben1Status, m.ben2Status, m.ben3Status, m.ben4Status, m.ben5Status, m.ben6Status, m.lastUpdate);
        const getBenIcon = (status) => (status === 'รับแล้ว' || status === 'รับสิทธิ์แล้ว') ? 'bg-red-500' : 'bg-green-500';

        // 🟢 สร้าง HTML ผู้รับสิทธิ์ (กรองเฉพาะคนที่มีชื่อ)
        let benHtml = '';
        let benCount = 0;
        for (let i = 1; i <= 6; i++) {
            const benName = m[`ben${i}Name`];
            const benStatus = m[`ben${i}Status`];
            if (benName && benName.trim() !== '') {
                benCount++;
                benHtml += `
                    <div class="flex justify-between items-center text-sm md:text-base font-medium">
                        <span class="text-gray-800">${benCount}. ${benName}</span>
                        <span class="w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-white shadow-sm ${getBenIcon(benStatus)}"></span>
                    </div>
                `;
            }
        }
        if (benCount === 0) benHtml = '<p class="text-center text-sm text-emerald-600/60 italic">ไม่มีข้อมูลผู้รับสิทธิ์</p>';

        // 🔵 สร้าง HTML ผู้รับเงิน (กรองเฉพาะคนที่มีชื่อ)
        let recHtml = '';
        let recCount = 0;
        for (let i = 1; i <= 6; i++) {
            const recName = m[`rec${i}Name`];
            if (recName && recName.trim() !== '') {
                recCount++;
                recHtml += `
                    <p class="flex items-center text-gray-700">
                        <span class="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 text-xs font-bold rounded-full mr-3 shadow-sm">${recCount}</span> 
                        ${recName}
                    </p>
                `;
            }
        }
        if (recCount === 0) recHtml = '<p class="text-center text-sm text-gray-400 italic">ไม่มีข้อมูลผู้รับเงิน</p>';

        htmlString += `
            <div class="bg-white p-5 md:p-6 rounded-3xl shadow-md border border-gray-100 mb-5 transition active:scale-[0.98]">
                
                <div class="flex justify-between items-start mb-4 gap-2">
                    <div>
                        <p class="text-xs text-gray-400 font-bold mb-1 uppercase tracking-wider">รหัสสมาชิก: <span class="text-gray-600">${m.memberId || '-'}</span></p>
                        <h3 class="text-2xl md:text-3xl font-bold text-slate-800 mb-1 leading-tight">${m.name}</h3>
                        <p class="text-sm md:text-base text-blue-600 font-bold">${m.community || '-'} (เขต ${m.zone || '-'})</p>
                    </div>
                    <span class="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border shadow-sm text-center ${statusData.class}">
                        ${statusData.text}
                    </span>
                </div>

                <div class="grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100">
                    <div class="text-center border-r border-slate-200">
                        <p class="text-[11px] text-slate-500 font-bold uppercase mb-1">เงินฝาก</p>
                        <p class="text-base md:text-lg font-bold text-slate-700">฿${(parseFloat(m.deposit) || 0).toLocaleString()}</p>
                    </div>
                    <div class="text-center border-r border-slate-200">
                        <p class="text-[11px] text-slate-500 font-bold uppercase mb-1">ขยะรวม</p>
                        <p class="text-base md:text-lg font-bold text-slate-700">฿${(parseFloat(m.trashIncome) || 0).toLocaleString()}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-[11px] text-slate-500 font-bold uppercase mb-1">หัก(ฌ)</p>
                        <p class="text-base md:text-lg font-bold text-red-500">฿${(parseFloat(m.deduction) || 0).toLocaleString()}</p>
                    </div>
                </div>

                <div class="flex items-center justify-between bg-amber-50 border border-amber-200 p-3.5 rounded-xl mb-4 shadow-sm">
                    <p class="text-sm font-bold text-amber-700">♻️ ขายขยะ (6 เดือน)</p>
                    <p class="text-lg md:text-xl font-bold text-amber-700">฿${(parseFloat(m.trash6Months) || 0).toLocaleString()}</p>
                </div>

                <div class="p-4 md:p-5 bg-blue-50/80 rounded-2xl flex justify-between items-center border border-blue-200 shadow-sm">
                    <p class="text-base md:text-lg font-bold text-gray-700">เงินคงเหลือสุทธิ</p>
                    <p class="text-3xl md:text-4xl font-bold text-blue-600 tracking-tight">฿${(parseFloat(m.balance) || 0).toLocaleString()}</p>
                </div>

                <div class="mt-5 pt-4 border-t border-gray-100">
                    <div class="grid grid-cols-1 gap-4">
                        
                        <div class="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                            <p class="text-xs font-bold text-emerald-700 mb-3 uppercase tracking-wider text-center">สถานะการรับสิทธิ์</p>
                            <div class="space-y-3">
                                ${benHtml}
                            </div>
                        </div>
                        
                        <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-inner">
                            <p class="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider text-center">ลำดับผู้ที่จะได้รับเงิน</p>
                            <div class="text-sm md:text-base space-y-3 font-medium">
                                ${recHtml}
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-5 text-center">
                        <p class="text-xs font-medium text-gray-400">อัปเดตข้อมูลล่าสุด: ${m.lastUpdate ? new Date(m.lastUpdate).toLocaleDateString('th-TH') : 'ไม่มีบันทึก'}</p>
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
        window.scrollTo({ top: 200, behavior: 'smooth' });
    }
};

window.nextUserPage = () => {
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayMembers();
        window.scrollTo({ top: 200, behavior: 'smooth' });
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
    if(filteredMembers.length > 0){
        displayMembers();
    } else {
        memberListEl.innerHTML = `
            <div class="text-center py-10 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <p class="text-gray-400 text-base">ไม่พบข้อมูลสมาชิกที่ค้นหา</p>
            </div>
        `;
        document.getElementById('userPaginationControls').classList.add('hidden');
    }
});

// รันโหลดข้อมูลเมื่อเปิดหน้า
loadMembers();
