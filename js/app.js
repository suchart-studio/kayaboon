import { db } from "./firebase-config.js";
import { collection, getDocs, setDoc, doc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const memberListEl = document.getElementById('memberList');
const searchInput = document.getElementById('searchInput');
const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQuyaHe7Cr6aikyZOqePNgtMbCzmD_HqgIf7C3bqkDf_4IkHO7yOq6kwvUm3u79q9JBcJob-XIHc2Yl/pub?gid=270111375&single=true&output=csv';

let allMembers = [];

async function loadMembers() {
    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        
        if(querySnapshot.empty) {
            memberListEl.innerHTML = '<div class="text-center text-red-500 bg-red-50 p-4 rounded-xl">ไม่พบข้อมูลในระบบ<br>โปรดกดดึงข้อมูลตั้งต้น</div>';
            document.getElementById('importDataBtn').classList.remove('hidden');
            return;
        }

        allMembers = [];
        querySnapshot.forEach((docSnap) => {
            allMembers.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        displayMembers(allMembers);

    } catch (error) {
        console.error("Error loading documents: ", error);
        memberListEl.innerHTML = '<div class="text-center text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

function displayMembers(members) {
    memberListEl.innerHTML = '';
    if (members.length === 0) {
        memberListEl.innerHTML = '<div class="text-center text-gray-500 py-10">ไม่พบสมาชิกที่ค้นหา</div>';
        return;
    }

    members.forEach(data => {
        const statusColor = data.status === 'ปกติ' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
        const card = `
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h3 class="font-bold text-gray-800 text-base">${data.name || 'ไม่มีชื่อ'}</h3>
                    <p class="text-xs text-gray-400">รหัส: ${data.memberId || data.id}</p>
                </div>
                <div class="text-right">
                    <div class="font-bold text-lg text-blue-600">฿${parseFloat(data.balance || 0).toLocaleString()}</div>
                    <span class="text-[10px] px-2 py-0.5 rounded-full ${statusColor}">${data.status || 'ไม่ระบุ'}</span>
                </div>
            </div>
        `;
        memberListEl.innerHTML += card;
    });
}

// ค้นหา
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allMembers.filter(m => 
        (m.name && m.name.toLowerCase().includes(term)) || 
        (m.memberId && m.memberId.toLowerCase().includes(term))
    );
    displayMembers(filtered);
});

// นำเข้าข้อมูล
document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importDataBtn').innerText = 'กำลังดึงข้อมูล...';
    Papa.parse(csvUrl, {
        download: true,
        header: true,
        complete: async function(results) {
            const data = results.data;
            let count = 0;
            for(let row of data) {
                if(!row['ชื่อ-สกุล']) continue; 
                
                const memberData = {
                    memberId: row['รหัสสมาชิก'] || String(Date.now() + count),
                    name: row['ชื่อ-สกุล'] || '',
                    status: row['สถานะ'] || 'ปกติ',
                    balance: parseFloat(row['ยอดเงินคงเหลือ'] || 0)
                };

                await setDoc(doc(db, "members", memberData.memberId), memberData);
                count++;
            }
            alert(`อัพโหลดเข้า Firebase สำเร็จ ${count} รายการ!`);
            document.getElementById('importDataBtn').classList.add('hidden');
            loadMembers();
        }
    });
});

loadMembers();