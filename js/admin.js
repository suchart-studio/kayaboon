import { db } from "./firebase-config.js";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, writeBatch, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const tableBody = document.getElementById('adminMemberTable');
const memberModal = document.getElementById('memberModal');
const memberForm = document.getElementById('memberForm');

let allMembers = [];
let filteredMembers = [];
let currentPage = 1;
const rowsPerPage = 50; 

// ----------------------------------------------------
// 1. ระบบ Login ผู้ดูแล
// ----------------------------------------------------
const loginOverlay = document.getElementById('loginOverlay');
const adminContent = document.getElementById('adminContent');
const loginError = document.getElementById('loginError');
const adminPasswordInput = document.getElementById('adminPassword');

if (sessionStorage.getItem('adminAuth') === 'true') {
    loginOverlay.classList.add('hidden');
    adminContent.classList.remove('hidden');
    fetchAdminMembers();
    fetchDeceasedRecords(); // โหลดข้อมูลประวัติผู้เสียชีวิต
}

window.checkPassword = () => {
    if (adminPasswordInput.value === '987654321') {
        sessionStorage.setItem('adminAuth', 'true');
        loginOverlay.classList.add('hidden');
        adminContent.classList.remove('hidden');
        fetchAdminMembers();
        fetchDeceasedRecords();
    } else {
        loginError.classList.remove('hidden');
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
    }
};

adminPasswordInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') checkPassword();
});

window.logoutAdmin = () => {
    sessionStorage.removeItem('adminAuth');
    location.reload(); 
};

// ----------------------------------------------------
// 2. ข้อมูลชุมชน
// ----------------------------------------------------
const communityData = {
    "0": ["พนักงานเทศบาล"],
    "1": ["โนนชัย 1", "โนนชัย 2", "โนนชัย 3", "ดอนหญ้านาง 1", "ดอนหญ้านาง 2", "ดอนหญ้านาง 3", "หลังศูนย์ราชการ 1", "หลังศูนย์ราชการ 2", "เทพารักษ์ 1", "เทพารักษ์ 2", "เทพารักษ์ 3", "เทพารักษ์ 4", "เทพารักษ์ 5", "พัฒนาเทพารักษ์", "เจ้าพ่อเกษม", "เจ้าพ่อทองสุข", "บขส"],
    "2": ["หนองใหญ่ 1", "หนองใหญ่ 2", "หนองใหญ่ 3", "หนองใหญ่ 4", "บ้านบะขาม", "ศรีจันทร์ประชา", "นาคะประเวศน์", "คุ้มพระลับ", "ชัยณรงค์-สามัคคี", "ธารทิพย์", "หน้า รพ.ศูนย์", "หลักเมือง", "บ้านเลขที่ 37", "ทุ่งเศรษฐี", "ศิริมงคล", "ศรีจันทร์พัฒนา", "มิตรสัมพันธ์ 1", "มิตรสัมพันธ์ 2", "ทุ่งสร้างพัฒนา", "โพธิบัลลังค์ทอง", "บ้านพัก ตชด", "หัวสะพานสัมพันธ์", "เจ้าพ่อขุนภักดี", "ธนาคร", "คุ้มหนองคู", "ศรีจันทร์", "ตรีเทพนครขอนแก่น"],
    "3": ["บ้านตูม", "เมืองเก่า 1", "เมืองเก่า 2", "เมืองเก่า 3", "เมืองเก่า 4", "คุ้มวัดกลาง", "คุ้มวัดธาตุ", "หลังสนามกีฬา 1", "หลังสนามกีฬา 2", "แก่นนคร", "กศน.", "โนนหนองวัด 1", "โนนหนองวัด 2", "โนนหนองวัด 3", "โนนหนองวัด 4", "หนองวัดพัฒนา", "คุ้มวุฒาราม", "โนนทัน1", "โนนทัน2", "โนนทัน3", "โนนทัน4", "โนนทัน5", "โนนทัน 6", "โนนทัน7", "โนนทัน8", "โนนทัน9", "การเคหะ", "เหล่านาดี12", "พระนครศรีบริรักษ์", "พิมานชลร่วมใจ", "95 ก้าวหน้านคร"],
    "4": ["สามเหลี่ยม 1", "สามเหลี่ยม 2", "สามเหลี่ยม 3", "สามเหลี่ยม 4", "สามเหลี่ยม 5", "ศรีฐาน 1", "ศรีฐาน 2", "ศรีฐาน 3", "ศรีฐาน 4", "หนองแวงตราชู 1", "หนองแวงตราชู 2", "หนองแวงตราชู 3", "หนองแวงตราชู 4", "คุ้มวัดป่าอดุลยาราม", "ไทยสมุทร", "เทคโนภาค", "ตะวันใหม่", "มิตรภาพ", "ตลาดต้นตาล"]
};

const communitySelect = document.getElementById('memberCommunity');
window.handleZoneChange = () => { populateCommunities(document.getElementById('memberZone').value); };
function populateCommunities(zoneValue, selectedCommunity = "") {
    communitySelect.innerHTML = '<option value="">-- เลือกชุมชน --</option>';
    if (zoneValue && communityData[zoneValue]) {
        communityData[zoneValue].forEach(comm => {
            const isSelected = comm === selectedCommunity ? 'selected' : '';
            communitySelect.innerHTML += `<option value="${comm}" ${isSelected}>${comm}</option>`;
        });
    } else { communitySelect.innerHTML = '<option value="">-- กรุณาเลือกเขตก่อน --</option>'; }
}

// ----------------------------------------------------
// 3. ฟังก์ชันคำนวณสถานะสมาชิก
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
        return monthsPassed <= 6 ? { text: "ยอดเยี่ยม", class: "bg-green-100 text-green-700 border-green-500" } : { text: "ยอดเยี่ยม (ขาดอัปเดต)", class: "bg-emerald-50 text-emerald-600 border-emerald-300" };
    } else { 
        if (monthsPassed > 6) return { text: "สิ้นสภาพ", class: "bg-gray-200 text-gray-800 border-gray-500" };
        if (monthsPassed > 4) return { text: "แย่แล้วล่ะ", class: "bg-red-100 text-red-700 border-red-500" };
        if (monthsPassed > 2) return { text: "ยุ่งล่ะสิ", class: "bg-yellow-100 text-yellow-700 border-yellow-500" };
        return { text: "ปกติ (กำลังสะสม)", class: "bg-sky-100 text-sky-700 border-sky-400" };
    }
}

// ----------------------------------------------------
// 4.1 ระบบค้นหาชื่อผู้เสียชีวิตอัตโนมัติ (Auto-complete)
// ----------------------------------------------------
const deceasedNameInput = document.getElementById('deceasedName');
const deceasedCommunityInput = document.getElementById('deceasedCommunity');
const deceasedSearchResult = document.getElementById('deceasedSearchResult');

deceasedNameInput.addEventListener('input', function() {
    const term = this.value.trim().toLowerCase();
    deceasedSearchResult.innerHTML = '';
    
    if (term.length < 2) {
        deceasedSearchResult.classList.add('hidden');
        deceasedCommunityInput.value = '';
        return;
    }

    const matches = allMembers.filter(m => m.name && m.name.toLowerCase().includes(term)).slice(0, 10);

    if (matches.length > 0) {
        matches.forEach(m => {
            const li = document.createElement('li');
            li.className = 'p-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors';
            const commText = m.community ? m.community : 'ไม่ระบุชุมชน';
            
            li.innerHTML = `
                <div class="font-bold text-gray-800">${m.name}</div>
                <div class="text-[11px] text-gray-500">รหัส: ${m.memberId || m.id} | ชุมชน: ${commText}</div>
            `;
            
            li.onclick = () => {
                deceasedNameInput.value = m.name;
                deceasedCommunityInput.value = commText;
                deceasedSearchResult.classList.add('hidden');
            };
            deceasedSearchResult.appendChild(li);
        });
        deceasedSearchResult.classList.remove('hidden');
    } else {
        deceasedSearchResult.innerHTML = '<li class="p-3 text-sm text-center text-gray-500">ไม่พบรายชื่อสมาชิก</li>';
        deceasedSearchResult.classList.remove('hidden');
    }
});

document.addEventListener('click', function(e) {
    if (!deceasedNameInput.contains(e.target) && !deceasedSearchResult.contains(e.target)) {
        deceasedSearchResult.classList.add('hidden');
    }
});

// ----------------------------------------------------
// 4.2 ระบบหักเงินฌาปนกิจแบบ Batch 
// ----------------------------------------------------
window.processDeathDeduction = async () => {
    const deceasedName = document.getElementById('deceasedName').value.trim();
    const deceasedComm = document.getElementById('deceasedCommunity').value.trim();

    if (!deceasedName || !deceasedComm) {
        alert('กรุณาพิมพ์และเลือกชื่อผู้เสียชีวิตจากรายชื่อ');
        return;
    }

    if (!confirm(`ยืนยันบันทึกการเสียชีวิตของ คุณ${deceasedName}\nชุมชน: ${deceasedComm}\nและหักเงินสมาชิกทุกคนคนละ 20 บาท?`)) return;

    const btn = document.getElementById('btnDeduction');
    const btnText = document.getElementById('btnDeductionText');
    const progressDiv = document.getElementById('deductionProgress');
    const progressBar = document.getElementById('deductionProgressBar');
    const statusText = document.getElementById('deductionStatusText');
    const percentText = document.getElementById('deductionPercent');

    try {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        progressDiv.classList.remove('hidden');
        statusText.innerText = "กำลังอ่านข้อมูลสมาชิกทั้งหมด...";

        const querySnapshot = await getDocs(collection(db, "members"));
        const total = querySnapshot.size;
        let processed = 0;
        let batch = writeBatch(db);
        let countInBatch = 0;
        const currentTime = new Date().toISOString();

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            const currentDed = parseFloat(data.deduction || 0);
            const currentBal = parseFloat(data.balance || 0);

            batch.update(docSnap.ref, {
                deduction: currentDed + 20,
                balance: currentBal - 20,
                lastUpdate: currentTime 
            });

            countInBatch++;
            processed++;

            if (countInBatch >= 400) {
                statusText.innerText = `กำลังบันทึกข้อมูล (${processed}/${total})...`;
                await batch.commit();
                
                const percent = Math.round((processed / total) * 100);
                progressBar.style.width = percent + '%';
                percentText.innerText = percent + '%';

                batch = writeBatch(db); 
                countInBatch = 0;
            }
        }

        if (countInBatch > 0) { await batch.commit(); }

        // 🟢 เพิ่มข้อมูลลงฐานข้อมูล deceased_records (ประวัติผู้เสียชีวิต)
        await addDoc(collection(db, "deceased_records"), {
            name: deceasedName,
            community: deceasedComm,
            date: currentTime,
            totalAmount: total * 20
        });

        progressBar.style.width = '100%';
        percentText.innerText = '100%';
        statusText.innerText = "ดำเนินการสำเร็จ!";
        
        alert(`หักเงินสมาชิกเรียบร้อยทั้งหมด ${total} รายการ\nยอดรวมหักครั้งนี้: ${(total * 20).toLocaleString()} บาท`);
        
        document.getElementById('deceasedName').value = '';
        document.getElementById('deceasedCommunity').value = '';
        
        fetchAdminMembers(); 
        fetchDeceasedRecords(); // อัปเดตตารางประวัติผู้เสียชีวิตด้านล่าง

    } catch (error) {
        console.error("Error Deduction:", error);
        alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
        btnText.innerText = "หักเงินสมาชิกทุกคน (20 บ./คน)";
        setTimeout(() => progressDiv.classList.add('hidden'), 4000);
    }
};

// ----------------------------------------------------
// 4.3 🟢 ระบบดึงข้อมูล และ แก้ไข/ลบ ประวัติผู้เสียชีวิต
// ----------------------------------------------------
async function fetchDeceasedRecords() {
    const table = document.getElementById('deceasedTable');
    table.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400">กำลังโหลดข้อมูลประวัติ...</td></tr>';
    try {
        const q = query(collection(db, "deceased_records"), orderBy("date", "desc"));
        const snap = await getDocs(q);
        let html = '';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const dateStr = new Date(d.date).toLocaleDateString('th-TH');
            html += `
                <tr class="hover:bg-red-50 transition-colors">
                    <td class="p-3 text-gray-600 font-mono text-xs">${dateStr}</td>
                    <td class="p-3 font-bold text-gray-800">${d.name}</td>
                    <td class="p-3 text-gray-600">${d.community}</td>
                    <td class="p-3 text-right text-red-600 font-bold">฿${(d.totalAmount || 0).toLocaleString()}</td>
                    <td class="p-3 text-center">
                        <button onclick="openDeceasedEdit('${docSnap.id}', '${d.name}', '${d.community}')" class="text-blue-500 hover:underline mr-3 text-xs font-bold">แก้ไข</button>
                        <button onclick="deleteDeceased('${docSnap.id}')" class="text-red-400 hover:underline text-xs font-bold">ลบ</button>
                    </td>
                </tr>
            `;
        });
        table.innerHTML = html || '<tr><td colspan="5" class="p-6 text-center text-gray-400">ยังไม่มีประวัติการเสียชีวิต</td></tr>';
    } catch (error) {
        console.error(error);
        table.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Error: ${error.message}</td></tr>`;
    }
}

// เปิดหน้าต่างแก้ไขผู้ตาย
window.openDeceasedEdit = (id, name, community) => {
    document.getElementById('editDeceasedId').value = id;
    document.getElementById('editDeceasedName').value = name;
    document.getElementById('editDeceasedCommunity').value = community;
    document.getElementById('deceasedModal').classList.remove('hidden');
};

// เซฟการแก้ไขประวัติ
window.saveDeceasedEdit = async () => {
    const id = document.getElementById('editDeceasedId').value;
    const name = document.getElementById('editDeceasedName').value.trim();
    const community = document.getElementById('editDeceasedCommunity').value.trim();
    
    if (!name) return alert('กรุณาระบุชื่อ');

    try {
        await updateDoc(doc(db, "deceased_records", id), { name, community });
        document.getElementById('deceasedModal').classList.add('hidden');
        alert('อัปเดตประวัติผู้เสียชีวิตเรียบร้อยแล้ว');
        fetchDeceasedRecords();
    } catch(e) { alert('เกิดข้อผิดพลาด: ' + e.message); }
};

// ลบประวัติ
window.deleteDeceased = async (id) => {
    if(confirm('ยืนยันการลบประวัตินี้? \n(หมายเหตุ: การลบนี้จะลบแค่ประวัติในตารางเท่านั้น จะไม่สามารถดึงเงินคืนให้สมาชิกอัตโนมัติได้)')) {
        try {
            await deleteDoc(doc(db, "deceased_records", id));
            fetchDeceasedRecords();
        } catch(e) { alert(e.message); }
    }
};

// ----------------------------------------------------
// 5. โหลดข้อมูลตารางและคำนวณ Dashboard
// ----------------------------------------------------
async function fetchAdminMembers() {
    tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-blue-500 font-bold animate-pulse">กำลังโหลดข้อมูล...</td></tr>';
    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        allMembers = [];
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-gray-400">ยังไม่มีข้อมูลสมาชิก</td></tr>';
            document.getElementById('adminPaginationControls').classList.add('hidden');
            updateAdminDashboardSummary([]); 
            return;
        }
        querySnapshot.forEach((docSnap) => { allMembers.push({ id: docSnap.id, ...docSnap.data() }); });
        updateAdminDashboardSummary(allMembers);
        filteredMembers = [...allMembers]; 
        currentPage = 1;
        displayAdminTable();
    } catch (error) { console.error("Error fetching data:", error); }
}

function updateAdminDashboardSummary(members) {
    let totalBalance = 0, activeCount = 0, inactiveCount = 0;
    members.forEach(m => {
        const bal = parseFloat(m.balance || 0);
        totalBalance += bal;
        if (bal >= 300) activeCount++; else inactiveCount++;
    });
    document.getElementById('adminTotalBalance').innerText = '฿' + totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2});
    document.getElementById('adminTotalMembers').innerHTML = `${members.length.toLocaleString()} <span class="text-base font-normal">คน</span>`;
    document.getElementById('adminActive').innerText = activeCount.toLocaleString();
    document.getElementById('adminInactive').innerText = inactiveCount.toLocaleString();
}

function displayAdminTable() {
    tableBody.innerHTML = '';
    const totalItems = filteredMembers.length;
    if (totalItems === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-gray-400">ไม่พบข้อมูลที่ค้นหา</td></tr>';
        document.getElementById('adminPaginationControls').classList.add('hidden');
        return;
    }

    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const displayData = filteredMembers.slice(startIndex, endIndex);

    let htmlString = '';
    displayData.forEach(member => {
        const statusObj = getMemberStatus(member.balance, member.ben1Status, member.ben2Status, member.ben3Status, member.lastUpdate);
        const commText = member.community ? `${member.community}` : '-';
        htmlString += `
            <tr class="hover:bg-blue-50 transition-colors border-b border-gray-100">
                <td class="p-3 font-mono text-[11px] text-gray-500">${member.memberId || member.id}</td>
                <td class="p-3 font-bold text-gray-800">${member.name}</td>
                <td class="p-3 text-blue-600 text-[11px]">${commText} <br>(ข.${member.zone || '-'})</td>
                <td class="p-3 text-right text-green-600">${parseFloat(member.deposit || 0).toLocaleString()}</td>
                <td class="p-3 text-right text-indigo-500 font-bold">${parseFloat(member.trashIncome || 0).toLocaleString()}</td>
                <td class="p-3 text-right text-yellow-500">${parseFloat(member.trash6Months || 0).toLocaleString()}</td>
                <td class="p-3 text-right text-red-500">${parseFloat(member.deduction || 0).toLocaleString()}</td>
                <td class="p-3 text-right font-bold text-blue-700 bg-blue-50/50">฿${parseFloat(member.balance || 0).toLocaleString()}</td>
                <td class="p-3 text-center">
                    <span class="px-2 py-1 rounded-lg text-[10px] font-bold border ${statusObj.class}">${statusObj.text}</span>
                </td>
                <td class="p-3 text-center">
                    <button onclick="openModal('edit', '${member.id}')" class="text-blue-500 hover:text-blue-800 font-bold underline text-xs">แก้ไข</button>
                    <button onclick="deleteMember('${member.id}')" class="text-red-400 hover:text-red-700 font-bold underline text-xs ml-1">ลบ</button>
                </td>
            </tr>
        `;
    });
    tableBody.innerHTML = htmlString;
    document.getElementById('adminPaginationControls').classList.remove('hidden');
    document.getElementById('adminPageInfo').innerText = `หน้า ${currentPage} จาก ${totalPages}`;
}

window.prevAdminPage = () => { if (currentPage > 1) { currentPage--; displayAdminTable(); } };
window.nextAdminPage = () => { const totalPages = Math.ceil(filteredMembers.length / rowsPerPage); if (currentPage < totalPages) { currentPage++; displayAdminTable(); } };

// ----------------------------------------------------
// 6. ระบบฟอร์มแก้ไขสมาชิก (Modal)
// ----------------------------------------------------
const depositInput = document.getElementById('deposit');
const trashIncomeInput = document.getElementById('trashIncome'); 
const withdrawInput = document.getElementById('withdraw');
const deductionInput = document.getElementById('deduction');
const balanceInput = document.getElementById('memberBalance');
const statusInput = document.getElementById('memberStatus');

function calculateBalance() {
    const d = parseFloat(depositInput.value) || 0;
    const tAccum = parseFloat(trashIncomeInput.value) || 0;
    const w = parseFloat(withdrawInput.value) || 0;
    const ded = parseFloat(deductionInput.value) || 0;
    const currentBalance = (d + tAccum) - w - ded;
    balanceInput.value = currentBalance.toFixed(2); 

    const ben1 = document.getElementById('ben1Status') ? document.getElementById('ben1Status').value : 'ยังไม่รับ';
    const ben2 = document.getElementById('ben2Status') ? document.getElementById('ben2Status').value : 'ยังไม่รับ';
    const ben3 = document.getElementById('ben3Status') ? document.getElementById('ben3Status').value : 'ยังไม่รับ';
    const statusData = getMemberStatus(currentBalance, ben1, ben2, ben3, window._tempLastUpdate || new Date().toISOString());

    statusInput.value = statusData.text;
    statusInput.className = `w-1/2 p-2 text-center border-2 rounded-lg font-bold ${statusData.class}`;
}

document.querySelectorAll('.calc-input, select[id^="ben"]').forEach(input => {
    input.addEventListener('input', calculateBalance);
    input.addEventListener('change', calculateBalance);
});

window.openModal = (mode, id = null) => {
    document.getElementById('formMode').value = mode;
    if (mode === 'add') {
        document.getElementById('modalTitle').innerText = 'เพิ่มสมาชิกใหม่';
        memberForm.reset();
        document.getElementById('memberId').readOnly = false;
        document.getElementById('docId').value = '';
        populateCommunities(""); 
        
        ['ben1Name', 'ben2Name', 'ben3Name', 'rec1Name', 'rec2Name', 'rec3Name'].forEach(field => {
            if(document.getElementById(field)) document.getElementById(field).value = '';
        });
        ['ben1Status', 'ben2Status', 'ben3Status'].forEach(field => {
            if(document.getElementById(field)) document.getElementById(field).value = 'ยังไม่รับ';
        });

        window._tempLastUpdate = new Date().toISOString();
        calculateBalance(); 
    } else if (mode === 'edit') {
        document.getElementById('modalTitle').innerText = 'แก้ไขข้อมูลสมาชิก';
        const member = allMembers.find(m => m.id === id);
        if (member) {
            document.getElementById('docId').value = id;
            document.getElementById('memberId').value = member.memberId || id;
            document.getElementById('memberId').readOnly = true;
            document.getElementById('memberName').value = member.name;
            document.getElementById('memberZone').value = member.zone || '';
            populateCommunities(member.zone || '', member.community || '');
            document.getElementById('joinDate').value = member.joinDate || '';
            
            document.getElementById('deposit').value = member.deposit || 0;
            document.getElementById('trashIncome').value = member.trashIncome || 0;
            document.getElementById('withdraw').value = member.withdraw || 0;
            document.getElementById('deduction').value = member.deduction || 0;
            document.getElementById('trash6Months').value = member.trash6Months || 0;

            if(document.getElementById('ben1Name')) document.getElementById('ben1Name').value = member.ben1Name || '';
            if(document.getElementById('ben1Status')) document.getElementById('ben1Status').value = member.ben1Status || 'ยังไม่รับ';
            if(document.getElementById('ben2Name')) document.getElementById('ben2Name').value = member.ben2Name || '';
            if(document.getElementById('ben2Status')) document.getElementById('ben2Status').value = member.ben2Status || 'ยังไม่รับ';
            if(document.getElementById('ben3Name')) document.getElementById('ben3Name').value = member.ben3Name || '';
            if(document.getElementById('ben3Status')) document.getElementById('ben3Status').value = member.ben3Status || 'ยังไม่รับ';
            
            if(document.getElementById('rec1Name')) document.getElementById('rec1Name').value = member.rec1Name || '';
            if(document.getElementById('rec2Name')) document.getElementById('rec2Name').value = member.rec2Name || '';
            if(document.getElementById('rec3Name')) document.getElementById('rec3Name').value = member.rec3Name || '';
            
            window._tempLastUpdate = member.lastUpdate; 
            calculateBalance(); 
        }
    }
    memberModal.classList.remove('hidden');
};

window.closeModal = () => { memberModal.classList.add('hidden'); };

memberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = document.getElementById('formMode').value;
    const docId = document.getElementById('docId').value;
    const mId = document.getElementById('memberId').value;
    
    calculateBalance();
    const currentTime = new Date().toISOString();

    const data = {
        memberId: mId,
        name: document.getElementById('memberName').value,
        zone: document.getElementById('memberZone').value,
        community: document.getElementById('memberCommunity').value,
        joinDate: document.getElementById('joinDate').value,
        deposit: parseFloat(document.getElementById('deposit').value) || 0,
        trashIncome: parseFloat(document.getElementById('trashIncome').value) || 0, 
        withdraw: parseFloat(document.getElementById('withdraw').value) || 0,
        deduction: parseFloat(document.getElementById('deduction').value) || 0,
        balance: parseFloat(document.getElementById('memberBalance').value) || 0, 
        trash6Months: parseFloat(document.getElementById('trash6Months').value) || 0,
        lastUpdate: currentTime 
    };

    if(document.getElementById('ben1Name')) {
        data.ben1Name = document.getElementById('ben1Name').value.trim();
        data.ben1Status = document.getElementById('ben1Status').value;
        data.ben2Name = document.getElementById('ben2Name').value.trim();
        data.ben2Status = document.getElementById('ben2Status').value;
        data.ben3Name = document.getElementById('ben3Name').value.trim();
        data.ben3Status = document.getElementById('ben3Status').value;
        data.rec1Name = document.getElementById('rec1Name').value.trim();
        data.rec2Name = document.getElementById('rec2Name').value.trim();
        data.rec3Name = document.getElementById('rec3Name').value.trim();
        const evaluatedStatus = getMemberStatus(data.balance, data.ben1Status, data.ben2Status, data.ben3Status, currentTime);
        data.status = evaluatedStatus.text; 
    }

    try {
        if (mode === 'add') { await setDoc(doc(db, "members", mId), data); }
        else if (mode === 'edit') { await updateDoc(doc(db, "members", docId), data); }
        closeModal();
        alert('บันทึกข้อมูลสำเร็จ!');
        fetchAdminMembers(); 
    } catch (error) { alert('เกิดข้อผิดพลาด: ' + error.message); }
});

// ----------------------------------------------------
// 7. ระบบนำเข้า ส่งออก ลบ และค้นหาสมาชิก
// ----------------------------------------------------
document.getElementById('excelUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        if(confirm(`พบข้อมูลสมาชิกจำนวน ${json.length} รายการ นำเข้าสู่ระบบหรือไม่?`)) {
            await importExcelToFirebase(json);
        }
        document.getElementById('excelUpload').value = ''; 
    };
    reader.readAsArrayBuffer(file);
});

async function importExcelToFirebase(data) {
    tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-indigo-600 font-bold animate-pulse text-lg">กำลังอัพโหลดข้อมูล...</td></tr>';
    let count = 0, batches = [], batch = writeBatch(db);
    const currentTime = new Date().toISOString();
    
    for(let i=0; i<data.length; i++) {
        let row = data[i];
        const name = row['ชื่อ สกุล'] || row['ชื่อ-สกุล'] || row['ชื่อ-นามสกุล'];
        if(!name) continue; 
        
        const d = parseFloat(row['เงินฝาก'] || 0), t = parseFloat(row['ค่าขายขยะ'] || row['ขายขยะสะสม'] || 0);
        const w = parseFloat(row['ถอนเงิน'] || 0), ded = parseFloat(row['หักฌาปนกิจ'] || 0);
        const t6m = parseFloat(row['ขายขยะใน 6 เดือน'] || row['ขยะ 6 เดือน'] || 0);
        const mId = String(row['เลขสมาชิก'] || row['รหัสสมาชิก'] || (Date.now() + count));

        batch.set(doc(db, "members", mId), {
            memberId: mId, name: name, zone: String(row['เขต'] || ''), community: String(row['ชุมชน'] || row['ชื่อชุมชน'] || ''),
            joinDate: String(row['วันที่สมัคร'] || ''), deposit: d, trashIncome: t, withdraw: w, deduction: ded,
            balance: (d + t) - w - ded, trash6Months: t6m, ben1Status: 'ยังไม่รับ', ben2Status: 'ยังไม่รับ', ben3Status: 'ยังไม่รับ', lastUpdate: currentTime
        });
        count++;
        if (count % 400 === 0) { batches.push(batch.commit()); batch = writeBatch(db); }
    }
    if (count % 400 !== 0) batches.push(batch.commit());
    await Promise.all(batches);
    alert(`อัพโหลดสำเร็จ ${count} รายการ!`);
    fetchAdminMembers();
}

window.exportToExcel = () => {
    if (allMembers.length === 0) return alert('ไม่มีข้อมูลสำหรับส่งออก');
    alert('กำลังเตรียมไฟล์ Excel กรุณารอสักครู่...');
    const exportData = filteredMembers.map(m => {
        const stat = getMemberStatus(m.balance, m.ben1Status, m.ben2Status, m.ben3Status, m.lastUpdate);
        return {
            'เลขสมาชิก': m.memberId || m.id, 'ชื่อ-สกุล': m.name || '', 'เขต': m.zone || '', 'ชุมชน': m.community || '',
            'วันที่สมัคร': m.joinDate || '', 'อัปเดตล่าสุด': m.lastUpdate ? new Date(m.lastUpdate).toLocaleDateString('th-TH') : '',
            'เงินฝาก': parseFloat(m.deposit || 0), 'ขายขยะสะสม': parseFloat(m.trashIncome || 0), 'ขายขยะใน 6 เดือน': parseFloat(m.trash6Months || 0),
            'ถอนเงิน': parseFloat(m.withdraw || 0), 'หักฌาปนกิจ': parseFloat(m.deduction || 0), 'ยอดเงินคงเหลือ': parseFloat(m.balance || 0),
            'สถานะสมาชิก': stat.text, 'ผู้รับสิทธิ์ 1': m.ben1Name || '', 'สถานะ 1': m.ben1Status || '',
            'ผู้รับสิทธิ์ 2': m.ben2Name || '', 'สถานะ 2': m.ben2Status || '', 'ผู้รับสิทธิ์ 3': m.ben3Name || '', 'สถานะ 3': m.ben3Status || ''
        };
    });
    XLSX.writeFile(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), XLSX.utils.json_to_sheet(exportData), "ข้อมูลสมาชิก"), `ข้อมูลสมาชิก_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.xlsx`);
};

window.deleteAllMembers = async () => {
    if (confirm('⚠️ คำเตือน!\nแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด?')) {
        if (prompt('พิมพ์คำว่า "ยืนยันการลบ"') !== 'ยืนยันการลบ') return alert('ยกเลิกการลบ');
        try {
            tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-red-600 font-bold animate-pulse">กำลังลบ...</td></tr>';
            const snap = await getDocs(collection(db, "members"));
            let batches = [], batch = writeBatch(db), count = 0;
            snap.forEach((d) => { batch.delete(d.ref); count++; if(count===400){ batches.push(batch.commit()); batch=writeBatch(db); count=0;} });
            if (count > 0) batches.push(batch.commit());
            await Promise.all(batches);
            alert('ลบเรียบร้อยแล้ว'); fetchAdminMembers();
        } catch (e) { alert('ลบไม่สำเร็จ: ' + e.message); }
    }
};

document.getElementById('adminSearchInput').addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    filteredMembers = term === '' ? [...allMembers] : allMembers.filter(m => (m.name && m.name.toLowerCase().includes(term)) || (m.memberId && String(m.memberId).toLowerCase().includes(term)) || (m.community && m.community.toLowerCase().includes(term)));
    currentPage = 1; displayAdminTable();
});
