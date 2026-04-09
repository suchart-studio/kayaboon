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
        const zoneText = data.zone ? `(เขต ${data.zone})` : '';
        const commText = data.community || '-';

        const card = `
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="font-bold text-gray-800 text-base">${data.name || 'ไม่มีชื่อ'}</h3>
                        <p class="text-xs text-gray-400">รหัส: ${data.memberId || data.id}</p>
                        <p class="text-xs text-blue-600 mt-1">📍 ชุมชน${commText} ${zoneText}</p>
                        <p class="text-[10px] text-gray-400 mt-0.5">วันที่สมัคร: ${data.joinDate || '-'}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] px-2 py-0.5 rounded-full ${statusColor}">${data.status || 'ไม่ระบุ'}</span>
                        <div class="text-[10px] text-gray-500 mt-1">ยอดเงินคงเหลือ</div>
                        <div class="font-bold text-xl text-blue-600 border-b border-blue-100 pb-1">฿${parseFloat(data.balance || 0).toLocaleString()}</div>
                    </div>
                </div>
                
                <div class="grid grid-cols-3 gap-2 text-center text-xs bg-gray-50 p-2 rounded-lg">
                    <div>
                        <p class="text-gray-500 mb-1">ฝากเงิน</p>
                        <p class="text-green-600 font-bold">฿${parseFloat(data.deposit || 0).toLocaleString()}</p>
                    </div>
                    <div class="border-l border-r border-gray-200">
                        <p class="text-gray-500 mb-1">ถอนเงิน</p>
                        <p class="text-red-500 font-bold">฿${parseFloat(data.withdraw || 0).toLocaleString()}</p>
                    </div>
                    <div>
                        <p class="text-gray-500 mb-1">หักฌาปนกิจ</p>
                        <p class="text-orange-500 font-bold">฿${parseFloat(data.deduction || 0).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `;
        memberListEl.innerHTML += card;
    });
}

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allMembers.filter(m => 
        (m.name && m.name.toLowerCase().includes(term)) || 
        (m.memberId && m.memberId.toLowerCase().includes(term)) ||
        (m.community && m.community.toLowerCase().includes(term))
    );
    displayMembers(filtered);
});

document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importDataBtn').innerText = 'กำลังดึงข้อมูล...';
    Papa.parse(csvUrl, {
        download: true,
        header: true,
        complete: async function(results) {
            const data = results.data;
            let count = 0;
            for(let row of data) {
                const name = row['ชื่อ สกุล'] || row['ชื่อ-สกุล'] || row['ชื่อ-นามสกุล'];
                if(!name) continue; 
                
                const memberData = {
                    memberId: row['เลขสมาชิก'] || row['รหัสสมาชิก'] || String(Date.now() + count),
                    name: name,
                    zone: row['เขต'] || '',
                    community: row['ชุมชน'] || row['ชื่อชุมชน'] || '',
                    joinDate: row['วันที่สมัคร'] || '',
                    deposit: parseFloat(row['เงินฝาก'] || 0),
                    withdraw: parseFloat(row['ถอนเงิน'] || 0),
                    deduction: parseFloat(row['หักฌาปนกิจ'] || 0),
                    balance: parseFloat(row['ยอดเงินคงเหลือ'] || 0),
                    status: row['สถานะสมาชิก'] || row['สถานะ'] || 'ปกติ'
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
