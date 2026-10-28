// Step 6: 점검 결과 저장, 불러오기, 이력 표, 요약 대시보드, CSV 내보내기 및 인쇄 구현

const STORAGE_KEY = "jcoding-check-v1";

// 점검 항목 데이터 정의
const INSPECTION_ITEMS = [
    // 서버
    { id: "srv-01", category: "서버", name: "서버 가동 상태" },
    { id: "srv-02", category: "서버", name: "CPU/메모리 사용률" },
    { id: "srv-03", category: "서버", name: "디스크 여유 공간" },
    // 백업
    { id: "bak-01", category: "백업", name: "전일 야간 백업 성공 여부" },
    { id: "bak-02", category: "백업", name: "백업 로그 확인" },
    // 네트워크
    { id: "net-01", category: "네트워크", name: "인터넷 회선 상태" },
    { id: "net-02", category: "네트워크", name: "스위치/AP 이상 램프 확인" },
    // 보안
    { id: "sec-01", category: "보안", name: "백신 서버 패턴 업데이트" },
    { id: "sec-02", category: "보안", name: "방화벽 로그 이상 여부" },
    // 환경
    { id: "env-01", category: "환경", name: "서버실 온도·습도" },
    { id: "env-02", category: "환경", name: "UPS 상태" }
];

document.addEventListener('DOMContentLoaded', function () {
    console.log("전산 일일 점검 도우미 - Step 6 초기화 완료");
    
    // 1. 오늘 날짜 기본 설정 (PC 현지 날짜 기준)
    const dateInput = document.getElementById('check-date');
    if (dateInput) {
        if (!dateInput.value) {
            dateInput.value = todayString();
        }
        dateInput.addEventListener('change', function () {
            loadRecordForDate(dateInput.value);
            updateSummary();
        });
    }

    // 2. 점검 항목 화면 렌더링
    renderInspectionItems();

    // 3. 버튼 이벤트 연결 (저장, CSV, 인쇄)
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSave);
    }

    const csvBtn = document.getElementById('btn-csv');
    if (csvBtn) {
        csvBtn.addEventListener('click', handleExportCSV);
    }

    const printBtn = document.getElementById('btn-print');
    if (printBtn) {
        printBtn.addEventListener('click', handlePrint);
    }

    // 4. 초기 날짜에 해당하는 데이터 불러오기 및 이력 표·요약 갱신
    if (dateInput) {
        loadRecordForDate(dateInput.value);
    }
    renderHistoryTable();
    updateSummary();
});

// PC의 현지 날짜를 "YYYY-MM-DD" 형태로 돌려주는 함수
function todayString() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
}

// 저장된 전체 이력을 읽어온다. 없거나 깨져 있으면 빈 객체를 돌려준다. (try-catch 적용)
function loadRecords() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error("저장 데이터를 읽지 못했습니다.", e);
        showAppMessage("저장된 데이터가 손상되어 초기 상태로 시작합니다.", "error");
        return {};
    }
}

// 특정 날짜의 점검 결과를 저장한다.
function saveRecord(date, record) {
    try {
        const all = loadRecords();
        all[date] = record;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        return true;
    } catch (e) {
        console.error("저장 중 오류가 발생했습니다.", e);
        showAppMessage("데이터 저장에 실패했습니다 (브라우저 저장소 확인 필요).", "error");
        return false;
    }
}

// 화면 메시지 영역에 안내 문구 표시 (alert 대체)
function showAppMessage(message, type = "success") {
    const msgBox = document.getElementById('app-message');
    if (!msgBox) return;

    msgBox.textContent = message;
    msgBox.className = `app-message ${type}`;

    setTimeout(() => {
        msgBox.className = "app-message hidden";
    }, 4000);
}

// 분류별로 항목을 그룹화하여 화면에 렌더링하는 함수
function renderInspectionItems() {
    const container = document.getElementById('inspection-items');
    if (!container) return;

    container.textContent = '';

    const categories = {};
    INSPECTION_ITEMS.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push(item);
    });

    Object.keys(categories).forEach(catName => {
        const catGroup = document.createElement('div');
        catGroup.className = 'category-group';

        const catTitle = document.createElement('div');
        catTitle.className = 'category-title';
        catTitle.textContent = catName;
        catGroup.appendChild(catTitle);

        const itemList = document.createElement('div');
        itemList.className = 'item-list';

        categories[catName].forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.className = 'item-row';
            itemRow.id = `row-${item.id}`;

            const headerRow = document.createElement('div');
            headerRow.className = 'item-header-row';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'item-name';
            nameSpan.textContent = item.name;
            headerRow.appendChild(nameSpan);

            const radiosDiv = document.createElement('div');
            radiosDiv.className = 'status-radios';

            const statuses = [
                { value: 'ok', label: '정상' },
                { value: 'warn', label: '주의' },
                { value: 'fail', label: '이상' }
            ];

            statuses.forEach(s => {
                const label = document.createElement('label');
                
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `status-${item.id}`;
                radio.value = s.value;
                if (s.value === 'ok') {
                    radio.checked = true; // 기본값 정상
                }

                radio.addEventListener('change', function () {
                    if (radio.value === 'fail' && radio.checked) {
                        itemRow.classList.add('status-fail');
                    } else {
                        const failRadio = document.querySelector(`input[name="status-${item.id}"][value="fail"]`);
                        if (!failRadio || !failRadio.checked) {
                            itemRow.classList.remove('status-fail');
                        }
                    }
                    updateSummary();
                });

                const textNode = document.createTextNode(s.label);
                label.appendChild(radio);
                label.appendChild(textNode);
                radiosDiv.appendChild(label);
            });

            headerRow.appendChild(radiosDiv);
            itemRow.appendChild(headerRow);

            const memoInput = document.createElement('input');
            memoInput.type = 'text';
            memoInput.className = 'item-memo';
            memoInput.placeholder = '메모 입력 (선택 또는 이상 시 필수)';
            memoInput.id = `memo-${item.id}`;
            // 메모 입력 시에도 요약 실시간 반영
            memoInput.addEventListener('input', function () {
                updateSummary();
            });
            itemRow.appendChild(memoInput);

            itemList.appendChild(itemRow);
        });

        catGroup.appendChild(itemList);
        container.appendChild(catGroup);
    });
}

// 특정 날짜의 데이터를 불러와 화면에 반영 (없으면 기본값 전부 정상)
function loadRecordForDate(dateStr) {
    const allRecords = loadRecords();
    const record = allRecords[dateStr];

    const inspectorInput = document.getElementById('inspector-name');
    const dateInput = document.getElementById('check-date');

    if (dateInput && dateInput.value !== dateStr) {
        dateInput.value = dateStr;
    }

    if (record) {
        if (inspectorInput) {
            inspectorInput.value = record.inspector || '';
        }

        INSPECTION_ITEMS.forEach(item => {
            const itemData = record.results && record.results[item.id];
            const statusVal = itemData ? itemData.status : 'ok';
            const memoVal = itemData ? itemData.memo : '';

            const radio = document.querySelector(`input[name="status-${item.id}"][value="${statusVal}"]`);
            if (radio) {
                radio.checked = true;
                const row = document.getElementById(`row-${item.id}`);
                if (row) {
                    if (statusVal === 'fail') {
                        row.classList.add('status-fail');
                    } else {
                        row.classList.remove('status-fail');
                    }
                }
            }

            const memoInput = document.getElementById(`memo-${item.id}`);
            if (memoInput) {
                memoInput.value = memoVal;
            }
        });
    } else {
        if (inspectorInput) {
            inspectorInput.value = '';
        }

        INSPECTION_ITEMS.forEach(item => {
            const okRadio = document.querySelector(`input[name="status-${item.id}"][value="ok"]`);
            if (okRadio) {
                okRadio.checked = true;
            }
            const row = document.getElementById(`row-${item.id}`);
            if (row) {
                row.classList.remove('status-fail');
            }
            const memoInput = document.getElementById(`memo-${item.id}`);
            if (memoInput) {
                memoInput.value = '';
            }
        });
    }
}

// 저장 버튼 클릭 핸들러
function handleSave() {
    const dateInput = document.getElementById('check-date');
    const inspectorInput = document.getElementById('inspector-name');

    if (!dateInput || !dateInput.value) {
        showAppMessage("점검일을 선택해주세요.", "error");
        return;
    }

    const dateStr = dateInput.value;
    const inspector = inspectorInput ? inspectorInput.value.trim() : "";

    if (!inspector) {
        showAppMessage("점검자 이름을 입력해주세요.", "error");
        if (inspectorInput) inspectorInput.focus();
        return;
    }

    const results = {};
    for (let i = 0; i < INSPECTION_ITEMS.length; i++) {
        const item = INSPECTION_ITEMS[i];
        const checkedRadio = document.querySelector(`input[name="status-${item.id}"]:checked`);
        const status = checkedRadio ? checkedRadio.value : 'ok';
        
        const memoInput = document.getElementById(`memo-${item.id}`);
        const memo = memoInput ? memoInput.value.trim() : "";

        if (status === 'fail' && !memo) {
            showAppMessage(`[${item.category} - ${item.name}] 항목이 '이상' 상태입니다. 사유 메모를 입력해주세요.`, "error");
            if (memoInput) memoInput.focus();
            return;
        }

        results[item.id] = {
            status: status,
            memo: memo
        };
    }

    const record = {
        inspector: inspector,
        results: results
    };

    const success = saveRecord(dateStr, record);
    if (success) {
        showAppMessage(`[${dateStr}] 점검 결과가 성공적으로 저장되었습니다.`, "success");
        renderHistoryTable();
        updateSummary();
    }
}

// 상태별 개수 계산 헬퍼 함수
function countByStatus(record) {
    const count = { ok: 0, warn: 0, fail: 0 };
    if (!record || !record.results) return count;
    Object.values(record.results).forEach(function (r) {
        if (count[r.status] !== undefined) {
            count[r.status] += 1;
        }
    });
    return count;
}

// 특정 날짜의 점검 데이터 삭제 함수
function deleteRecord(dateStr) {
    try {
        const all = loadRecords();
        if (all[dateStr]) {
            delete all[dateStr];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
            return true;
        }
    } catch (e) {
        console.error("삭제 중 오류가 발생했습니다.", e);
        showAppMessage("데이터 삭제에 실패했습니다.", "error");
    }
    return false;
}

// 점검 이력 표 렌더링 함수
function renderHistoryTable() {
    const container = document.getElementById('inspection-history');
    if (!container) return;

    container.textContent = '';

    const allRecords = loadRecords();
    const dates = Object.keys(allRecords).sort().reverse();

    if (dates.length === 0) {
        const emptyP = document.createElement('div');
        emptyP.className = 'history-empty';
        emptyP.textContent = '저장된 점검 이력이 없습니다.';
        container.appendChild(emptyP);
        return;
    }

    const table = document.createElement('table');
    table.className = 'history-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['날짜', '점검자', '정상', '주의', '이상', '관리'];
    
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    dates.forEach(dateStr => {
        const record = allRecords[dateStr];
        const counts = countByStatus(record);

        const tr = document.createElement('tr');
        tr.className = 'history-row';
        if (counts.fail > 0) {
            tr.classList.add('has-fail');
        }

        tr.addEventListener('click', function (e) {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }
            loadRecordForDate(dateStr);
            updateSummary();
            showAppMessage(`[${dateStr}] 점검 데이터를 불러왔습니다.`, "success");
        });

        const tdDate = document.createElement('td');
        tdDate.textContent = dateStr;
        tr.appendChild(tdDate);

        const tdInspector = document.createElement('td');
        tdInspector.textContent = record.inspector || '-';
        tr.appendChild(tdInspector);

        const tdOk = document.createElement('td');
        tdOk.textContent = counts.ok;
        tr.appendChild(tdOk);

        const tdWarn = document.createElement('td');
        tdWarn.textContent = counts.warn;
        tr.appendChild(tdWarn);

        const tdFail = document.createElement('td');
        tdFail.textContent = counts.fail;
        tr.appendChild(tdFail);

        const tdAction = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.textContent = '삭제';

        deleteBtn.addEventListener('click', function () {
            const confirmed = window.confirm(`[${dateStr}] 점검 이력을 정말 삭제하시겠습니까?`);
            if (confirmed) {
                const success = deleteRecord(dateStr);
                if (success) {
                    showAppMessage(`[${dateStr}] 점검 이력이 삭제되었습니다.`, "success");
                    renderHistoryTable();
                    updateSummary();
                    
                    const currentDateInput = document.getElementById('check-date');
                    if (currentDateInput && currentDateInput.value === dateStr) {
                        loadRecordForDate(dateStr);
                        updateSummary();
                    }
                }
            }
        });

        tdAction.appendChild(deleteBtn);
        tr.appendChild(tdAction);

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

// 요약 대시보드 갱신 함수
function getCurrentScreenResults() {
    const results = {};
    INSPECTION_ITEMS.forEach(item => {
        const checkedRadio = document.querySelector(`input[name="status-${item.id}"]:checked`);
        const status = checkedRadio ? checkedRadio.value : 'ok';
        const memoInput = document.getElementById(`memo-${item.id}`);
        const memo = memoInput ? memoInput.value.trim() : '';

        results[item.id] = { status, memo };
    });
    return results;
}

function updateSummary() {
    const currentResults = getCurrentScreenResults();
    
    const totalCount = INSPECTION_ITEMS.length;
    let okCount = 0;
    let warnCount = 0;
    let failCount = 0;

    const issueItems = [];

    INSPECTION_ITEMS.forEach(item => {
        const res = currentResults[item.id];
        if (res.status === 'ok') okCount++;
        else if (res.status === 'warn') {
            warnCount++;
            issueItems.push({ category: item.category, name: item.name, status: 'warn', memo: res.memo });
        } else if (res.status === 'fail') {
            failCount++;
            issueItems.push({ category: item.category, name: item.name, status: 'fail', memo: res.memo });
        }
    });

    const statTotal = document.getElementById('stat-total');
    const statOk = document.getElementById('stat-ok');
    const statWarn = document.getElementById('stat-warn');
    const statFail = document.getElementById('stat-fail');

    if (statTotal) statTotal.textContent = totalCount;
    if (statOk) statOk.textContent = okCount;
    if (statWarn) statWarn.textContent = warnCount;
    if (statFail) statFail.textContent = failCount;

    renderIssuesList(issueItems);
    renderWeeklyRates();
}

function renderIssuesList(issues) {
    const container = document.getElementById('issues-list-container');
    if (!container) return;

    container.textContent = '';

    if (issues.length === 0) {
        const noMsg = document.createElement('div');
        noMsg.className = 'no-issues';
        noMsg.textContent = '현재 이상 또는 주의 항목이 없습니다.';
        container.appendChild(noMsg);
        return;
    }

    issues.forEach(issue => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `issue-item ${issue.status}`;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'issue-header';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'issue-title';
        titleSpan.textContent = `[${issue.category}] ${issue.name}`;
        headerDiv.appendChild(titleSpan);

        const badgeSpan = document.createElement('span');
        badgeSpan.className = `issue-badge ${issue.status}`;
        badgeSpan.textContent = issue.status === 'fail' ? '이상' : '주의';
        headerDiv.appendChild(badgeSpan);

        itemDiv.appendChild(headerDiv);

        if (issue.memo) {
            const memoSpan = document.createElement('span');
            memoSpan.className = 'issue-memo-text';
            memoSpan.textContent = `사유: ${issue.memo}`;
            itemDiv.appendChild(memoSpan);
        }

        container.appendChild(itemDiv);
    });
}

function addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
}

function getRecent7Days(baseDateStr) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        days.push(addDays(baseDateStr, -i));
    }
    return days;
}

function renderWeeklyRates() {
    const container = document.getElementById('weekly-rate-container');
    if (!container) return;

    container.textContent = '';

    const dateInput = document.getElementById('check-date');
    const baseDate = dateInput && dateInput.value ? dateInput.value : todayString();
    const recentDays = getRecent7Days(baseDate);
    const allRecords = loadRecords();
    const totalItems = INSPECTION_ITEMS.length;

    recentDays.forEach(dateStr => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'weekly-bar-row';

        const dateSpan = document.createElement('span');
        dateSpan.className = 'weekly-date';
        dateSpan.textContent = dateStr;
        rowDiv.appendChild(dateSpan);

        const record = allRecords[dateStr];

        if (record && record.results) {
            let okCount = 0;
            Object.values(record.results).forEach(r => {
                if (r.status === 'ok') okCount++;
            });

            const rate = Math.round((okCount / totalItems) * 100);

            const barBg = document.createElement('div');
            barBg.className = 'weekly-bar-bg';

            const barFill = document.createElement('div');
            barFill.className = 'weekly-bar-fill';
            barFill.style.width = rate + '%';
            barBg.appendChild(barFill);

            rowDiv.appendChild(barBg);

            const rateText = document.createElement('span');
            rateText.className = 'weekly-rate-text';
            rateText.textContent = rate + '%';
            rowDiv.appendChild(rateText);
        } else {
            const noRecSpan = document.createElement('span');
            noRecSpan.className = 'weekly-no-record';
            noRecSpan.textContent = '기록 없음';
            rowDiv.appendChild(noRecSpan);
        }

        container.appendChild(rowDiv);
    });
}

// -------------------------------------------------------------------------
// Step 6: CSV 내보내기 및 인쇄 기능 구현
// -------------------------------------------------------------------------

// 상태 코드를 한글 명칭으로 변환하는 헬퍼 함수
function statusToKorean(status) {
    if (status === 'ok') return '정상';
    if (status === 'warn') return '주의';
    if (status === 'fail') return '이상';
    return '정상';
}

// CSV 셀 값 이스케이프 처리 (쉼표, 큰따옴표, 줄바꿈 대응)
function escapeCsvValue(val) {
    if (val === null || val === undefined) {
        return '""';
    }
    const stringVal = String(val);
    // 큰따옴표는 두 개("")로 치환하고 전체를 큰따옴표로 감쌈
    const escaped = stringVal.replace(/"/g, '""');
    return `"${escaped}"`;
}

// CSV 내보내기 버튼 핸들러
function handleExportCSV() {
    const allRecords = loadRecords();
    const dates = Object.keys(allRecords).sort().reverse(); // 최신순 정렬

    if (dates.length === 0) {
        showAppMessage("내보낼 점검 이력이 없습니다.", "error");
        return;
    }

    // CSV 헤더 행 구성
    const headers = ['날짜', '점검자', '분류', '점검 항목', '상태', '메모'];
    const csvRows = [];
    csvRows.writerow = function(arr) {
        this.push(arr.map(escapeCsvValue).join(','));
    };

    csvRows.writerow(headers);

    // 각 날짜별, 각 항목별 데이터 행 추가
    dates.forEach(dateStr => {
        const record = allRecords[dateStr];
        const inspector = record.inspector || '';
        const results = record.results || {};

        INSPECTION_ITEMS.forEach(item => {
            const itemResult = results[item.id] || { status: 'ok', memo: '' };
            const statusKor = statusToKorean(itemResult.status);
            const memo = itemResult.memo || '';

            const rowData = [
                dateStr,
                inspector,
                item.category,
                item.name,
                statusKor,
                memo
            ];
            csvRows.writerow(rowData);
        });
    });

    // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 추가
    const csvContent = "﻿" + csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // 파일명 생성: 일일점검_이력_YYYYMMDD.csv (오늘 날짜)
    const todayFormatted = todayString().replace(/-/g, '');
    const fileName = `일일점검_이력_${todayFormatted}.csv`;

    // 브라우저 다운로드 실행
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAppMessage(`[${fileName}] 파일이 성공적으로 다운로드되었습니다.`, "success");
}

// 인쇄 버튼 핸들러
function handlePrint() {
    window.print();
}
