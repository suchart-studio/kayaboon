import { db } from "./firebase-config.js";
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

let typeChartInstance = null;
let barChartInstance = null;

// ----------------------------------------------------
// 1. ฟังก์ชันประเมินสถานะสมาชิก (เงื่อนไขเดียวกับ Admin)
// ----------------------------------------------------
function getMemberStatus(balance, ben1, ben2, ben3, lastUpdate) {
    const bal = parseFloat(balance || 0);
    const claimedCount = [ben1, ben2, ben3].filter(s => s === 'รับแล้ว' || s === 'รับสิทธิ์แล้ว').length;
    if (claimedCount >= 3) return { text: "รับสิทธิ์ครบแล้ว", class: "bg-blue-100 text-blue-700 border-blue-400" };

    const dateToUse = lastUpdate || new Date().toISOString();
    const lastDate = new Date(dateToUse);
    const now = new Date();
    const monthsPassed = Math.abs(now - lastDate) / (1000 * 60 * 60 * 24 * 30.44); 

    if (bal >= 300) {
        return monthsPassed <= 6 ? { text: "ยอดเยี่ยม" } : { text: "ยอดเยี่ยม (ขาดอัปเดต)" };
    } else { 
        if (monthsPassed > 6) return { text: "สิ้นสภาพ" };
        if (bal < 0) return { text: "แย่แล้ว" };
        return { text: "ยุ่งล่ะสิ" };
    }
}

// ----------------------------------------------------
// 2. ฟังก์ชันโหลดสถิติสมาชิก แยก 6 กล่อง
// ----------------------------------------------------
async function loadMemberStats() {
    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        let totalBalance = 0;
        let activeCount = 0;    // ยอดเยี่ยม / ปกติ
        let warningCount = 0;   // ยุ่งล่ะสิ
        let badCount = 0;       // แย่แล้ว
        let inactiveCount = 0;  // สิ้นสภาพ

        querySnapshot.forEach((doc) => {
            const m = doc.data();
            const bal = parseFloat(m.balance || 0);
            totalBalance += bal;
            
            // ใช้ฟังก์ชันประเมินสถานะ
            const stat = getMemberStatus(m.balance, m.ben1Status, m.ben2Status, m.ben3Status, m.lastUpdate);
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

        // นำค่าไปอัปเดตหน้า Dashboard
        const elTotalBal = document.getElementById('reportTotalBalance');
        if (elTotalBal) {
            elTotalBal.innerText = '฿' + totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2});
            document.getElementById('reportTotalMembers').innerHTML = `${querySnapshot.size.toLocaleString()} <span class="text-sm font-normal text-gray-500">คน</span>`;
            
            // ข้อมูลสถานะ 4 กลุ่ม
            document.getElementById('reportActive').innerText = activeCount.toLocaleString();
            document.getElementById('reportWarning').innerText = warningCount.toLocaleString();
            document.getElementById('reportBad').innerText = badCount.toLocaleString();
            document.getElementById('reportInactive').innerText = inactiveCount.toLocaleString();
        }

    } catch (error) {
        console.error("Error loading member stats:", error);
    }
}

// ----------------------------------------------------
// 3. ฟังก์ชันโหลดประวัติขยะ (ตาราง & กราฟ)
// ----------------------------------------------------
async function loadTrashRecords() {
    try {
        const q = query(collection(db, "trash_records"), orderBy("date", "desc"), limit(100));
        const snap = await getDocs(q);
        
        let glass = 0, paper = 0, plastic = 0, metal = 0, other = 0;
        const commMap = {};
        const tbody = document.getElementById('dashTrashTable');
        let html = '';

        snap.forEach(docSnap => {
            const d = docSnap.data();
            
            // สะสมน้ำหนักขยะเพื่อทำกราฟวงกลม
            glass += parseFloat(d.glass || 0);
            paper += parseFloat(d.paper || 0);
            plastic += parseFloat(d.plastic || 0);
            metal += parseFloat(d.metal || 0);
            other += parseFloat(d.other || 0);
            
            const total = parseFloat(d.total || 0);

            // สะสมน้ำหนักขยะรายชุมชนเพื่อทำกราฟแท่ง
            const c = d.community || 'ไม่ระบุชุมชน';
            if (!commMap[c]) commMap[c] = 0;
            commMap[c] += total;

            // ตารางล่าสุด
            html += `
                <tr class="hover:bg-blue-50 transition-colors">
                    <td class="p-4 border-b font-mono text-slate-500">${d.date}</td>
                    <td class="p-4 border-b font-bold text-slate-800">${c}</td>
                    <td class="p-4 border-b text-right text-blue-600">${(parseFloat(d.glass) || 0).toFixed(2)}</td>
                    <td class="p-4 border-b text-right text-emerald-600">${(parseFloat(d.paper) || 0).toFixed(2)}</td>
                    <td class="p-4 border-b text-right text-amber-600">${(parseFloat(d.plastic) || 0).toFixed(2)}</td>
                    <td class="p-4 border-b text-right text-indigo-600">${(parseFloat(d.metal) || 0).toFixed(2)}</td>
                    <td class="p-4 border-b text-right text-purple-600">${(parseFloat(d.other) || 0).toFixed(2)}</td>
                    <td class="p-4 border-b text-right font-bold text-blue-700 bg-blue-50/50">${total.toFixed(2)}</td>
                </tr>
            `;
        });

        if (!html) html = '<tr><td colspan="8" class="p-8 text-center text-slate-400">ยังไม่มีประวัติการคัดแยกขยะ</td></tr>';
        tbody.innerHTML = html;

        // วาดกราฟ
        renderCharts(glass, paper, plastic, metal, other, commMap);

    } catch (error) {
        console.error("Error loading trash records:", error);
    }
}

// ----------------------------------------------------
// 4. ฟังก์ชันวาดกราฟ Chart.js
// ----------------------------------------------------
function renderCharts(glass, paper, plastic, metal, other, commMap) {
    
    // 1. กราฟวงกลม (Doughnut) สัดส่วนประเภทขยะ
    const ctx1 = document.getElementById('trashTypeChart').getContext('2d');
    if (typeChartInstance) typeChartInstance.destroy();
    typeChartInstance = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['แก้ว', 'กระดาษ', 'พลาสติก', 'โลหะ', 'อื่นๆ'],
            datasets: [{
                data: [glass, paper, plastic, metal, other],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#a855f7'],
                borderWidth: 2
            }]
        },
        options: { 
            maintainAspectRatio: false, 
            plugins: { legend: { position: 'bottom' } } 
        }
    });

    // 2. กราฟแท่ง (Bar) 10 อันดับชุมชน
    const ctx2 = document.getElementById('communityBarChart').getContext('2d');
    if (barChartInstance) barChartInstance.destroy();
    
    // จัดเรียงชุมชนจากน้ำหนักเยอะสุดไปน้อยสุด เอาแค่ 10 อันดับแรก
    const topLabels = Object.keys(commMap).sort((a,b) => commMap[b] - commMap[a]).slice(0, 10);
    const topValues = topLabels.map(l => commMap[l]);

    barChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: topLabels,
            datasets: [{
                label: 'น้ำหนักขยะรวม (กก.)',
                data: topValues,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: { 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// ----------------------------------------------------
// เริ่มต้นทำงานเมื่อโหลดหน้าเสร็จ
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    loadMemberStats();
    loadTrashRecords();
});
