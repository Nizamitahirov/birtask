// BirTask - Google Apps Script Backend
// Bu kodu Google Apps Script-ə yapışdırın və Web App kimi deploy edin
// Deploy: Extensions > Apps Script > Deploy > New Deployment > Web App
//   - Execute as: Me
//   - Who has access: Anyone

var SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

var SHEETS = {
  PROJECTS: 'Projects',
  TASKS: 'Tasks',
  TEAM: 'Team',
  ACTIVITY: 'Activity'
};

var PROJECT_HEADERS = ['id','name','description','status','priority','startDate','endDate','budget','owner','color','progress','createdAt'];
var TASK_HEADERS    = ['id','projectId','projectName','title','description','status','priority','assignee','dueDate','tags','createdAt','updatedAt'];
var TEAM_HEADERS    = ['id','name','email','role','department','phone','avatar','createdAt'];
var ACTIVITY_HEADERS= ['id','type','message','entityId','entityType','userId','createdAt'];

// ─── GET Handler ─────────────────────────────────────────────────────────────
function doGet(e) {
  var action = e.parameter.action;
  var result;
  try {
    switch (action) {
      case 'getProjects':  result = getProjects(e.parameter);  break;
      case 'getProject':   result = getProject(e.parameter.id); break;
      case 'getTasks':     result = getTasks(e.parameter);     break;
      case 'getTask':      result = getTask(e.parameter.id);   break;
      case 'getTeam':      result = getTeam();                 break;
      case 'getActivity':  result = getActivity();             break;
      case 'getDashboard': result = getDashboard();            break;
      case 'getBatch':     result = getBatch();                break;
      default:             result = { success: false, error: 'Naməlum action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── POST Handler ────────────────────────────────────────────────────────────
function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;
  var result;
  try {
    switch (action) {
      case 'initSheet':        result = initSheet();           break;
      case 'importExcelData':  result = importExcelData();    break;
      case 'createProject': result = createProject(body);   break;
      case 'updateProject': result = updateProject(body);   break;
      case 'deleteProject': result = deleteProject(body.id); break;
      case 'createTask':    result = createTask(body);      break;
      case 'updateTask':    result = updateTask(body);      break;
      case 'deleteTask':    result = deleteTask(body.id);   break;
      case 'createMember':  result = createMember(body);    break;
      case 'updateMember':  result = updateMember(body);    break;
      case 'deleteMember':  result = deleteMember(body.id); break;
      default:              result = { success: false, error: 'Naməlum action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Init Sheet ──────────────────────────────────────────────────────────────
function initSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  function ensureSheet(name, headers) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.getRange(1, 1, 1, headers.length)
        .setBackground('#0D1321')
        .setFontColor('#94A3B8')
        .setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    return sh;
  }

  ensureSheet(SHEETS.PROJECTS,  PROJECT_HEADERS);
  ensureSheet(SHEETS.TASKS,     TASK_HEADERS);
  ensureSheet(SHEETS.TEAM,      TEAM_HEADERS);
  ensureSheet(SHEETS.ACTIVITY,  ACTIVITY_HEADERS);

  // Sample data
  addSampleData(ss);

  return { success: true, data: 'Sheet uğurla yaradıldı' };
}

function addSampleData(ss) {
  var pSheet = ss.getSheetByName(SHEETS.PROJECTS);
  if (pSheet.getLastRow() > 1) return; // Already has data

  var now = new Date().toISOString();
  var projects = [
    ['p1','BirTask Platforması','Layihə idarəetmə platformasının inkişafı','Davam edir','Yüksək','2025-01-01','2025-06-30','50000','Nizami Tahirov','#3B82F6','65',now],
    ['p2','Mobil Tətbiq','iOS və Android üçün mobil tətbiq','Planlaşdırılır','Kritik','2025-03-01','2025-09-30','80000','Aytən Hüseynova','#8B5CF6','10',now],
    ['p3','API İnteqrasiyası','Üçüncü tərəf API-larla inteqrasiya','Tamamlandı','Orta','2024-10-01','2024-12-31','20000','Kamran Əliyev','#10B981','100',now],
    ['p4','Dizayn Sistemi','Korporativ dizayn sisteminin yaradılması','Davam edir','Orta','2025-02-01','2025-05-31','15000','Leyla Məmmədova','#06B6D4','40',now],
  ];
  pSheet.getRange(2, 1, projects.length, PROJECT_HEADERS.length).setValues(projects);

  var tSheet = ss.getSheetByName(SHEETS.TASKS);
  var tasks = [
    ['t1','p1','BirTask Platforması','Frontend inkişafı','React komponentlərinin yaradılması','Davam edir','Yüksək','Nizami Tahirov','2025-03-15','frontend,react','2025-01-05T00:00:00.000Z',now],
    ['t2','p1','BirTask Platforması','Backend API','REST API endpointlərinin qurulması','Tamamlandı','Yüksək','Kamran Əliyev','2025-02-28','backend,api','2025-01-06T00:00:00.000Z',now],
    ['t3','p1','BirTask Platforması','Google Sheets inteqrasiyası','Apps Script ilə inteqrasiya','Yoxlanılır','Yüksək','Aytən Hüseynova','2025-03-20','sheets,integration','2025-01-07T00:00:00.000Z',now],
    ['t4','p2','Mobil Tətbiq','UI/UX dizayn','Figma dizaynlarının hazırlanması','Gözləyir','Orta','Leyla Məmmədova','2025-04-01','design,figma','2025-01-10T00:00:00.000Z',now],
    ['t5','p2','Mobil Tətbiq','React Native qurulum','Əsas layihə strukturunun qurulması','Gözləyir','Kritik','Nizami Tahirov','2025-04-15','react-native,mobile','2025-01-11T00:00:00.000Z',now],
    ['t6','p4','Dizayn Sistemi','Rəng paleti','Korporativ rəng sisteminin müəyyənləşdirilməsi','Tamamlandı','Aşağı','Leyla Məmmədova','2025-02-15','design,colors','2025-01-15T00:00:00.000Z',now],
    ['t7','p4','Dizayn Sistemi','Komponent kitabxanası','Əsas UI komponentlərinin hazırlanması','Davam edir','Orta','Aytən Hüseynova','2025-05-01','components,ui','2025-01-16T00:00:00.000Z',now],
  ];
  tSheet.getRange(2, 1, tasks.length, TASK_HEADERS.length).setValues(tasks);

  var mSheet = ss.getSheetByName(SHEETS.TEAM);
  var members = [
    ['m1','Nizami Tahirov','nizami@birtask.az','Full-Stack Developer','Texnologiya','+994501234567','NT',now],
    ['m2','Aytən Hüseynova','ayten@birtask.az','UX Designer','Dizayn','+994552345678','AH',now],
    ['m3','Kamran Əliyev','kamran@birtask.az','Backend Developer','Texnologiya','+994703456789','KE',now],
    ['m4','Leyla Məmmədova','leyla@birtask.az','Product Manager','Məhsul','+994514567890','LM',now],
  ];
  mSheet.getRange(2, 1, members.length, TEAM_HEADERS.length).setValues(members);

  var aSheet = ss.getSheetByName(SHEETS.ACTIVITY);
  var activities = [
    ['a1','create','BirTask Platforması layihəsi yaradıldı','p1','project','m1',now],
    ['a2','complete','Backend API tapşırığı tamamlandı','t2','task','m3',now],
    ['a3','create','Mobil Tətbiq layihəsi yaradıldı','p2','project','m4',now],
    ['a4','update','Dizayn Sistemi yeniləndi','p4','project','m2',now],
  ];
  aSheet.getRange(2, 1, activities.length, ACTIVITY_HEADERS.length).setValues(activities);
}

// ─── Generic Helpers ─────────────────────────────────────────────────────────
function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function sheetToObjects(sheet, headers) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return data
    .filter(function(row) { return row[0] !== ''; })
    .map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
      return obj;
    });
}

function findRowById(sheet, id, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function objectToRow(obj, headers) {
  return headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
}

function generateId() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function logActivity(type, message, entityId, entityType) {
  try {
    var sheet = getSheet(SHEETS.ACTIVITY);
    if (!sheet) return;
    var row = [generateId(), type, message, entityId, entityType, 'system', new Date().toISOString()];
    sheet.appendRow(row);
  } catch(e) {}
}

// ─── Projects ─────────────────────────────────────────────────────────────────
function getProjects(params) {
  var sheet = getSheet(SHEETS.PROJECTS);
  var data = sheetToObjects(sheet, PROJECT_HEADERS);
  if (params && params.status) {
    data = data.filter(function(p) { return p.status === params.status; });
  }
  return { success: true, data: data };
}

function getProject(id) {
  var sheet = getSheet(SHEETS.PROJECTS);
  var data = sheetToObjects(sheet, PROJECT_HEADERS);
  var found = data.find(function(p) { return p.id === id; });
  if (!found) return { success: false, error: 'Layihə tapılmadı' };
  return { success: true, data: found };
}

function createProject(body) {
  var sheet = getSheet(SHEETS.PROJECTS);
  var now = new Date().toISOString();
  var project = {
    id: generateId(),
    name: body.name || '',
    description: body.description || '',
    status: body.status || 'Planlaşdırılır',
    priority: body.priority || 'Orta',
    startDate: body.startDate || '',
    endDate: body.endDate || '',
    budget: body.budget || '',
    owner: body.owner || '',
    color: body.color || '#3B82F6',
    progress: body.progress || '0',
    createdAt: now,
  };
  sheet.appendRow(objectToRow(project, PROJECT_HEADERS));
  logActivity('create', project.name + ' layihəsi yaradıldı', project.id, 'project');
  return { success: true, data: project };
}

function updateProject(body) {
  var sheet = getSheet(SHEETS.PROJECTS);
  var row = findRowById(sheet, body.id, PROJECT_HEADERS);
  if (row === -1) return { success: false, error: 'Layihə tapılmadı' };
  var existing = sheetToObjects(sheet, PROJECT_HEADERS).find(function(p) { return p.id === body.id; });
  var updated = Object.assign(existing, body, { id: body.id });
  sheet.getRange(row, 1, 1, PROJECT_HEADERS.length).setValues([objectToRow(updated, PROJECT_HEADERS)]);
  logActivity('update', updated.name + ' layihəsi yeniləndi', body.id, 'project');
  return { success: true, data: updated };
}

function deleteProject(id) {
  var sheet = getSheet(SHEETS.PROJECTS);
  var row = findRowById(sheet, id, PROJECT_HEADERS);
  if (row === -1) return { success: false, error: 'Layihə tapılmadı' };
  var name = sheet.getRange(row, 2).getValue();
  sheet.deleteRow(row);
  logActivity('delete', name + ' layihəsi silindi', id, 'project');
  return { success: true };
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
function getTasks(params) {
  var sheet = getSheet(SHEETS.TASKS);
  var data = sheetToObjects(sheet, TASK_HEADERS);
  if (params && params.projectId) {
    data = data.filter(function(t) { return t.projectId === params.projectId; });
  }
  if (params && params.status) {
    data = data.filter(function(t) { return t.status === params.status; });
  }
  return { success: true, data: data };
}

function getTask(id) {
  var sheet = getSheet(SHEETS.TASKS);
  var data = sheetToObjects(sheet, TASK_HEADERS);
  var found = data.find(function(t) { return t.id === id; });
  if (!found) return { success: false, error: 'Tapşırıq tapılmadı' };
  return { success: true, data: found };
}

function createTask(body) {
  var sheet = getSheet(SHEETS.TASKS);
  var now = new Date().toISOString();
  var task = {
    id: generateId(),
    projectId: body.projectId || '',
    projectName: body.projectName || '',
    title: body.title || '',
    description: body.description || '',
    status: body.status || 'Gözləyir',
    priority: body.priority || 'Orta',
    assignee: body.assignee || '',
    dueDate: body.dueDate || '',
    tags: body.tags || '',
    createdAt: now,
    updatedAt: now,
  };
  sheet.appendRow(objectToRow(task, TASK_HEADERS));
  logActivity('create', task.title + ' tapşırığı yaradıldı', task.id, 'task');
  return { success: true, data: task };
}

function updateTask(body) {
  var sheet = getSheet(SHEETS.TASKS);
  var row = findRowById(sheet, body.id, TASK_HEADERS);
  if (row === -1) return { success: false, error: 'Tapşırıq tapılmadı' };
  var existing = sheetToObjects(sheet, TASK_HEADERS).find(function(t) { return t.id === body.id; });
  var updated = Object.assign(existing, body, { id: body.id, updatedAt: new Date().toISOString() });
  sheet.getRange(row, 1, 1, TASK_HEADERS.length).setValues([objectToRow(updated, TASK_HEADERS)]);
  if (updated.status === 'Tamamlandı') {
    logActivity('complete', updated.title + ' tamamlandı', body.id, 'task');
  } else {
    logActivity('update', updated.title + ' yeniləndi', body.id, 'task');
  }
  return { success: true, data: updated };
}

function deleteTask(id) {
  var sheet = getSheet(SHEETS.TASKS);
  var row = findRowById(sheet, id, TASK_HEADERS);
  if (row === -1) return { success: false, error: 'Tapşırıq tapılmadı' };
  var title = sheet.getRange(row, 4).getValue();
  sheet.deleteRow(row);
  logActivity('delete', title + ' tapşırığı silindi', id, 'task');
  return { success: true };
}

// ─── Team ─────────────────────────────────────────────────────────────────────
function getTeam() {
  var sheet = getSheet(SHEETS.TEAM);
  var data = sheetToObjects(sheet, TEAM_HEADERS);
  return { success: true, data: data };
}

function createMember(body) {
  var sheet = getSheet(SHEETS.TEAM);
  var now = new Date().toISOString();
  var member = {
    id: generateId(),
    name: body.name || '',
    email: body.email || '',
    role: body.role || '',
    department: body.department || '',
    phone: body.phone || '',
    avatar: body.avatar || (body.name || '').split(' ').map(function(n){ return n[0]; }).join('').toUpperCase(),
    createdAt: now,
  };
  sheet.appendRow(objectToRow(member, TEAM_HEADERS));
  logActivity('create', member.name + ' komandaya qoşuldu', member.id, 'team');
  return { success: true, data: member };
}

function updateMember(body) {
  var sheet = getSheet(SHEETS.TEAM);
  var row = findRowById(sheet, body.id, TEAM_HEADERS);
  if (row === -1) return { success: false, error: 'Üzv tapılmadı' };
  var existing = sheetToObjects(sheet, TEAM_HEADERS).find(function(m) { return m.id === body.id; });
  var updated = Object.assign(existing, body, { id: body.id });
  sheet.getRange(row, 1, 1, TEAM_HEADERS.length).setValues([objectToRow(updated, TEAM_HEADERS)]);
  return { success: true, data: updated };
}

function deleteMember(id) {
  var sheet = getSheet(SHEETS.TEAM);
  var row = findRowById(sheet, id, TEAM_HEADERS);
  if (row === -1) return { success: false, error: 'Üzv tapılmadı' };
  sheet.deleteRow(row);
  logActivity('delete', 'Komanda üzvü silindi', id, 'team');
  return { success: true };
}

// ─── Activity ─────────────────────────────────────────────────────────────────
function getActivity() {
  var sheet = getSheet(SHEETS.ACTIVITY);
  var data = sheetToObjects(sheet, ACTIVITY_HEADERS);
  data.reverse();
  return { success: true, data: data.slice(0, 20) };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function getDashboard() {
  var projects = sheetToObjects(getSheet(SHEETS.PROJECTS), PROJECT_HEADERS);
  var tasks = sheetToObjects(getSheet(SHEETS.TASKS), TASK_HEADERS);
  var team = sheetToObjects(getSheet(SHEETS.TEAM), TEAM_HEADERS);

  var today = new Date();
  var overdue = tasks.filter(function(t) {
    return t.dueDate && new Date(t.dueDate) < today && t.status !== 'Tamamlandı';
  });

  return {
    success: true,
    data: {
      totalProjects: projects.length,
      activeProjects: projects.filter(function(p){ return p.status === 'Davam edir'; }).length,
      completedProjects: projects.filter(function(p){ return p.status === 'Tamamlandı'; }).length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(function(t){ return t.status === 'Tamamlandı'; }).length,
      overdueTasks: overdue.length,
      teamSize: team.length,
    }
  };
}

// ─── Batch (performance) ──────────────────────────────────────────────────────
function getBatch() {
  var projects = sheetToObjects(getSheet(SHEETS.PROJECTS), PROJECT_HEADERS);
  var tasks    = sheetToObjects(getSheet(SHEETS.TASKS),    TASK_HEADERS);
  var team     = sheetToObjects(getSheet(SHEETS.TEAM),     TEAM_HEADERS);
  var activity = sheetToObjects(getSheet(SHEETS.ACTIVITY), ACTIVITY_HEADERS);
  activity.reverse();
  return {
    success: true,
    data: {
      projects: projects,
      tasks: tasks,
      team: team,
      activity: activity.slice(0, 20)
    }
  };
}

// ─── Import Excel Data ────────────────────────────────────────────────────────
function importExcelData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Ensure sheets exist first
  initSheet();

  var pSheet = ss.getSheetByName(SHEETS.PROJECTS);
  var tSheet = ss.getSheetByName(SHEETS.TASKS);
  var mSheet = ss.getSheetByName(SHEETS.TEAM);

  // Clear existing data (keep headers)
  if (pSheet.getLastRow() > 1) pSheet.deleteRows(2, pSheet.getLastRow() - 1);
  if (tSheet.getLastRow() > 1) tSheet.deleteRows(2, tSheet.getLastRow() - 1);
  if (mSheet.getLastRow() > 1) mSheet.deleteRows(2, mSheet.getLastRow() - 1);

  var now = new Date().toISOString();

  // ── Team Members ─────────────────────────────────────────────────────────────
  var teamData = [
    ['tm1','Nizami Tahirov',  'nizami@birtask.az',  'IT Developer',    'Texnologiya', '+994501234567', 'NT', now],
    ['tm2','Ağaəli',          'agaeli@birtask.az',  'HR Specialist',   'HR Ops',      '',              'AG', now],
    ['tm3','Ülvi',            'ulvi@birtask.az',    'HR Specialist',   'HR Ops',      '',              'UL', now],
    ['tm4','Nərgiz',          'nergiz@birtask.az',  'HR Specialist',   'HR Ops',      '',              'NE', now],
    ['tm5','Aytən',           'ayten@birtask.az',   'HR Specialist',   'HR Ops',      '',              'AY', now],
    ['tm6','Farida',          'farida@birtask.az',  'HR Specialist',   'HR Ops',      '',              'FA', now],
    ['tm7','Hüseyn',          'huseyn@birtask.az',  'HR Specialist',   'HR Ops',      '',              'HU', now],
    ['tm8','İlaha',           'ilaha@birtask.az',   'HR Specialist',   'HR Ops',      '',              'IL', now],
    ['tm9','Ümid',            'umid@birtask.az',    'Legal',           'Hüquq',       '',              'UM', now],
    ['tm10','Aida',           'aida@birtask.az',    'HR BP',           'HR BP',       '',              'AI', now],
  ];
  mSheet.getRange(2, 1, teamData.length, TEAM_HEADERS.length).setValues(teamData);

  // ── Projects ──────────────────────────────────────────────────────────────────
  var projects = [
    ['p01','Məzuniyyət Planlama - Birbank',           'Birbank üzrə məzuniyyət planlama sistemi',           'Davam edir',      'Yüksək', '2026-04-01','2026-04-23','','Ağaəli',           '#3B82F6','84',now],
    ['p02','Məzuniyyət Planlama - Pashapay',          'Pashapay üzrə məzuniyyət planlama sistemi',          'Davam edir',      'Yüksək', '2026-04-07','2026-04-23','','Nərgiz',           '#8B5CF6','84',now],
    ['p03','Məzuniyyət Planlama - Birmarket',         'Birmarket üzrə məzuniyyət planlama sistemi',         'Davam edir',      'Yüksək', '2026-04-07','2026-04-23','','Aytən',            '#06B6D4','84',now],
    ['p04','Prosedurlar - Pashapay və Birmarket',     'HR prosedurlarının hazırlanması',                    'Davam edir',      'Orta',   '2026-04-28','2026-05-15','','Ülvi, İlaha',      '#10B981','30',now],
    ['p05','Əmək müqaviləsi - Pashapay',             'Pashapay üçün əmək müqavilələrinin hazırlanması',    'Davam edir',      'Yüksək', '2026-04-16','2026-05-16','','Ülvi, İlaha, Aytən','#F59E0B','28',now],
    ['p06','Əmək müqaviləsi - Birmarket',            'Birmarket üçün əmək müqavilələrinin hazırlanması',   'Davam edir',      'Yüksək', '2026-04-16','2026-05-16','','Ülvi, İlaha, Aytən','#EC4899','28',now],
    ['p07','Müstəqil Həmkarlar İttifaqı - Pashapay', 'Pashapay Həmkarlar İttifaqının təsis edilməsi',      'Davam edir',      'Kritik', '2026-04-16','2026-05-11','','Nizami Tahirov',   '#EF4444','56',now],
    ['p08','Müstəqil Həmkarlar İttifaqı - Birmarket','Birmarket Həmkarlar İttifaqının təsis edilməsi',     'Planlaşdırılır',  'Kritik', '','',        '','Nizami Tahirov',   '#F97316','0', now],
    ['p09','Birmarket Analiz',                        'Birmarket HR analizi',                               'Planlaşdırılır',  'Orta',   '2026-04-21','2026-05-31','','Nizami Tahirov, Ağaəli','#3B82F6','0',now],
    ['p10','Birmarket Məzuniyyət qeydiyyatı sistemi', 'Birmarket məzuniyyət qeydiyyat sisteminin qurulması','Davam edir',      'Yüksək', '2026-04-20','2026-05-20','','Nizami Tahirov',   '#8B5CF6','64',now],
    ['p11','Gündəlik yenilənən işçi siyahısı',       'Dinamik işçi siyahısı sisteminin qurulması',         'Davam edir',      'Orta',   '2026-04-20','2026-05-08','','Nizami Tahirov',   '#06B6D4','92',now],
    ['p12','Struktur Dəyişiklikləri',                 'Şirkət strukturunun yenilənməsi',                    'Davam edir',      'Yüksək', '2026-04-20','2026-05-20','','Aida',             '#10B981','30',now],
    ['p13','Pashapay HR Diaqnostika',                 'Pashapay HR proseslərinin diaqnostikası',            'Tamamlandı',      'Orta',   '2026-04-20','2026-04-21','','Nizami Tahirov',   '#94A3B8','100',now],
  ];
  pSheet.getRange(2, 1, projects.length, PROJECT_HEADERS.length).setValues(projects);

  // ── Tasks ─────────────────────────────────────────────────────────────────────
  var tasks = [
    // p01 - Məzuniyyət Planlama - Birbank
    ['t001','p01','Məzuniyyət Planlama - Birbank',   'Balans datası',       '31 Dekabra qədər olan',  'Tamamlandı','Yüksək','Ağaəli',                '2026-04-04','','2026-04-01T00:00:00Z',now],
    ['t002','p01','Məzuniyyət Planlama - Birbank',   'Planlama faylları',   'Macros - VBA kod',       'Tamamlandı','Yüksək','Nizami Tahirov',         '2026-04-04','','2026-04-01T00:00:00Z',now],
    ['t003','p01','Məzuniyyət Planlama - Birbank',   'Access Management',   'Sharepoint',             'Tamamlandı','Orta',  'Ağaəli, Ülvi',          '2026-04-07','','2026-04-01T00:00:00Z',now],
    ['t004','p01','Məzuniyyət Planlama - Birbank',   'Kommunikasiya',       'Intcom',                 'Tamamlandı','Orta',  'Ağaəli, Ülvi',          '2026-04-08','','2026-04-01T00:00:00Z',now],
    ['t005','p01','Məzuniyyət Planlama - Birbank',   'Reporting',           'Plan vs earned vs used', 'Davam edir','Yüksək','Nizami Tahirov',         '2026-04-23','','2026-04-14T00:00:00Z',now],
    // p02 - Məzuniyyət Planlama - Pashapay
    ['t006','p02','Məzuniyyət Planlama - Pashapay',  'Balans datası',       '31 Dekabra qədər olan',  'Tamamlandı','Yüksək','Nərgiz',                '2026-04-09','','2026-04-07T00:00:00Z',now],
    ['t007','p02','Məzuniyyət Planlama - Pashapay',  'Planlama faylları',   'Macros - VBA kod',       'Tamamlandı','Yüksək','Nizami Tahirov',         '2026-04-10','','2026-04-09T00:00:00Z',now],
    ['t008','p02','Məzuniyyət Planlama - Pashapay',  'Access Management',   'Sharepoint',             'Tamamlandı','Orta',  'Nizami Tahirov',         '2026-04-10','','2026-04-10T00:00:00Z',now],
    ['t009','p02','Məzuniyyət Planlama - Pashapay',  'Kommunikasiya',       'Intcom',                 'Tamamlandı','Orta',  'Nərgiz',                '2026-04-13','','2026-04-10T00:00:00Z',now],
    ['t010','p02','Məzuniyyət Planlama - Pashapay',  'Reporting',           'Plan vs earned vs used', 'Davam edir','Yüksək','Nizami Tahirov, Farida', '2026-04-23','','2026-04-15T00:00:00Z',now],
    // p03 - Məzuniyyət Planlama - Birmarket
    ['t011','p03','Məzuniyyət Planlama - Birmarket', 'Balans datası',       '31 Dekabra qədər olan',  'Tamamlandı','Yüksək','Aytən',                 '2026-04-09','','2026-04-07T00:00:00Z',now],
    ['t012','p03','Məzuniyyət Planlama - Birmarket', 'Planlama faylları',   'Macros - VBA kod',       'Tamamlandı','Yüksək','Nizami Tahirov',         '2026-04-10','','2026-04-09T00:00:00Z',now],
    ['t013','p03','Məzuniyyət Planlama - Birmarket', 'Access Management',   'Sharepoint',             'Tamamlandı','Orta',  'Nizami Tahirov',         '2026-04-10','','2026-04-10T00:00:00Z',now],
    ['t014','p03','Məzuniyyət Planlama - Birmarket', 'Kommunikasiya',       'Intcom',                 'Tamamlandı','Orta',  'Nərgiz',                '2026-04-13','','2026-04-10T00:00:00Z',now],
    ['t015','p03','Məzuniyyət Planlama - Birmarket', 'Reporting',           'Plan vs earned vs used', 'Davam edir','Yüksək','Nizami Tahirov, Aytən',  '2026-04-23','','2026-04-15T00:00:00Z',now],
    // p04 - Prosedurlar
    ['t016','p04','Prosedurlar - Pashapay və Birmarket','Məzuniyyət',       'Prosedur hazırlığı',     'Davam edir','Orta',  'Ülvi, İlaha, Aytən',    '2026-05-15','','2026-04-28T00:00:00Z',now],
    ['t017','p04','Prosedurlar - Pashapay və Birmarket','Ezamiyyət',        'Cost saving yoxlamaq',   'Davam edir','Orta',  'Hüseyn, İlaha, Aytən',  '2026-05-15','','2026-04-28T00:00:00Z',now],
    ['t018','p04','Prosedurlar - Pashapay və Birmarket','Xitam qaydaları',  '',                       'Davam edir','Orta',  'Ülvi, İlaha, Aytən',    '2026-05-15','','2026-04-28T00:00:00Z',now],
    ['t019','p04','Prosedurlar - Pashapay və Birmarket','Daxili intizam qaydaları','',                'Gözləyir',  'Aşağı', '',                      '','',        '2026-04-28T00:00:00Z',now],
    ['t020','p04','Prosedurlar - Pashapay və Birmarket','Miqrasiya',        'Cost Saving yoxlamaq',   'Gözləyir',  'Orta',  'Hüseyn',                '','',        '2026-04-28T00:00:00Z',now],
    // p05 - Əmək müqaviləsi - Pashapay
    ['t021','p05','Əmək müqaviləsi - Pashapay',     '5 günlük',            'Vahid Ekosistem - Legal','Davam edir','Yüksək','Ülvi, İlaha, Aytən',    '2026-05-16','','2026-04-16T00:00:00Z',now],
    ['t022','p05','Əmək müqaviləsi - Pashapay',     '6 günlük',            'Vahid Ekosistem',        'Davam edir','Yüksək','Ülvi, İlaha, Aytən',    '2026-05-16','','2026-04-16T00:00:00Z',now],
    ['t023','p05','Əmək müqaviləsi - Pashapay',     'Növbəli',             'Vahid Ekosistem',        'Gözləyir',  'Orta',  'Ülvi, İlaha',           '','',        '2026-04-16T00:00:00Z',now],
    ['t024','p05','Əmək müqaviləsi - Pashapay',     'Əvəzçilik',           'Vahid Ekosistem',        'Gözləyir',  'Orta',  'Ülvi, İlaha',           '','',        '2026-04-16T00:00:00Z',now],
    // p06 - Əmək müqaviləsi - Birmarket
    ['t025','p06','Əmək müqaviləsi - Birmarket',    '5 günlük',            'Vahid Ekosistem - Legal','Davam edir','Yüksək','Ülvi, İlaha, Aytən',    '2026-05-16','','2026-04-16T00:00:00Z',now],
    ['t026','p06','Əmək müqaviləsi - Birmarket',    '6 günlük',            'Vahid Ekosistem',        'Davam edir','Yüksək','Ülvi, İlaha, Aytən',    '2026-05-16','','2026-04-16T00:00:00Z',now],
    ['t027','p06','Əmək müqaviləsi - Birmarket',    'Növbəli',             'Vahid Ekosistem',        'Davam edir','Orta',  'Ülvi, İlaha',           '2026-04-25','','2026-04-16T00:00:00Z',now],
    ['t028','p06','Əmək müqaviləsi - Birmarket',    'Əvəzçilik',           'Vahid Ekosistem',        'Davam edir','Orta',  'Ülvi, İlaha',           '2026-04-25','','2026-04-16T00:00:00Z',now],
    // p07 - Həmkarlar İttifaqı - Pashapay
    ['t029','p07','Müstəqil Həmkarlar İttifaqı - Pashapay','Elektron təsdiq forması',  'MS Forms',  'Yoxlanılır','Yüksək','Nizami Tahirov',         '2026-04-23','','2026-04-20T00:00:00Z',now],
    ['t030','p07','Müstəqil Həmkarlar İttifaqı - Pashapay','Kağız daşıyıcıda təsdiq', 'Mail Merge','Yoxlanılır','Yüksək','Nizami Tahirov',         '2026-04-19','','2026-04-16T00:00:00Z',now],
    ['t031','p07','Müstəqil Həmkarlar İttifaqı - Pashapay','Nizamnamə hazırlığı',      'Legal',     'Tamamlandı','Kritik','Ümid',                   '2026-04-21','','2026-04-20T00:00:00Z',now],
    ['t032','p07','Müstəqil Həmkarlar İttifaqı - Pashapay','Əməkdaşların razılıq ərizələri','HR OP','Gözləyir', 'Kritik','Nizami Tahirov',         '2026-05-11','','2026-04-21T00:00:00Z',now],
    ['t033','p07','Müstəqil Həmkarlar İttifaqı - Pashapay','Təsis edilmə',             'Legal',     'Gözləyir', 'Kritik','Ümid',                   '2026-05-10','','2026-04-20T00:00:00Z',now],
    // p08 - Həmkarlar İttifaqı - Birmarket
    ['t034','p08','Müstəqil Həmkarlar İttifaqı - Birmarket','Elektron təsdiq forması', 'MS Forms',  'Gözləyir', 'Yüksək','Nizami Tahirov',         '','',        '2026-04-20T00:00:00Z',now],
    ['t035','p08','Müstəqil Həmkarlar İttifaqı - Birmarket','Kağız daşıyıcıda təsdiq','Mail Merge', 'Gözləyir', 'Yüksək','Nizami Tahirov',         '','',        '2026-04-20T00:00:00Z',now],
    ['t036','p08','Müstəqil Həmkarlar İttifaqı - Birmarket','Nizamnamə hazırlığı',     'Legal',     'Gözləyir', 'Kritik','Ümid',                   '','',        '2026-04-20T00:00:00Z',now],
    ['t037','p08','Müstəqil Həmkarlar İttifaqı - Birmarket','Təsis edilmə',            'Legal',     'Gözləyir', 'Kritik','Ümid',                   '','',        '2026-04-20T00:00:00Z',now],
    // p09 - Birmarket Analiz
    ['t038','p09','Birmarket Analiz',               'Əmək münasibətləri',  '',                       'Gözləyir', 'Orta',  'Nizami Tahirov, Ağaəli', '2026-05-31','','2026-04-21T00:00:00Z',now],
    ['t039','p09','Birmarket Analiz',               'Əmək haqqı və ödənişlər','',                   'Gözləyir', 'Orta',  'Nizami Tahirov, Ağaəli', '2026-05-31','','2026-04-21T00:00:00Z',now],
    ['t040','p09','Birmarket Analiz',               'HR Data',             '',                       'Gözləyir', 'Orta',  'Nizami Tahirov, Ağaəli', '2026-05-31','','2026-04-21T00:00:00Z',now],
    ['t041','p09','Birmarket Analiz',               'HRIS Sistem',         '',                       'Gözləyir', 'Orta',  'Nizami Tahirov, Ağaəli', '2026-05-31','','2026-04-21T00:00:00Z',now],
    // p10 - Məzuniyyət qeydiyyat sistemi
    ['t042','p10','Birmarket Məzuniyyət qeydiyyatı sistemi','Prosesin tanışlığı','',                  'Tamamlandı','Orta', 'Nizami Tahirov',         '2026-04-23','','2026-04-20T00:00:00Z',now],
    ['t043','p10','Birmarket Məzuniyyət qeydiyyatı sistemi','IT İnfrastucture - MS 365','',           'Yoxlanılır','Yüksək','Nizami Tahirov',        '2026-04-23','','2026-04-20T00:00:00Z',now],
    ['t044','p10','Birmarket Məzuniyyət qeydiyyatı sistemi','Data Source-ların təyini','',            'Tamamlandı','Yüksək','Nizami Tahirov',        '2026-04-30','','2026-04-23T00:00:00Z',now],
    ['t045','p10','Birmarket Məzuniyyət qeydiyyatı sistemi','App Development','',                     'Davam edir','Kritik','Nizami Tahirov',        '2026-05-20','','2026-04-30T00:00:00Z',now],
    ['t046','p10','Birmarket Məzuniyyət qeydiyyatı sistemi','Debug and Publish','',                   'Gözləyir', 'Kritik','Nizami Tahirov',         '','',        '2026-05-20T00:00:00Z',now],
    // p11 - İşçi siyahısı
    ['t047','p11','Gündəlik yenilənən işçi siyahısı','Birbank üzrə data toplanma','',               'Tamamlandı','Orta', 'Nizami Tahirov',         '2026-04-23','','2026-04-20T00:00:00Z',now],
    ['t048','p11','Gündəlik yenilənən işçi siyahısı','Birmarket üzrə data toplanma','',             'Tamamlandı','Orta', 'Nizami Tahirov',         '2026-04-23','','2026-04-20T00:00:00Z',now],
    ['t049','p11','Gündəlik yenilənən işçi siyahısı','Pashapay üzrə data toplanma','',              'Tamamlandı','Orta', 'Nizami Tahirov',         '2026-04-23','','2026-04-20T00:00:00Z',now],
    ['t050','p11','Gündəlik yenilənən işçi siyahısı','Dynamic inteqrasiya','',                       'Tamamlandı','Yüksək','Nizami Tahirov',        '2026-04-23','','2026-04-20T00:00:00Z',now],
    ['t051','p11','Gündəlik yenilənən işçi siyahısı','Line Manager data','',                          'Davam edir','Yüksək','Ülvi',                 '2026-05-08','','2026-05-04T00:00:00Z',now],
    // p12 - Struktur Dəyişiklikləri
    ['t052','p12','Struktur Dəyişiklikləri',         'Birbank',             '1500 icra, 300 növbədə', 'Davam edir','Yüksək','Aida',                 '2026-05-20','','2026-04-20T00:00:00Z',now],
    ['t053','p12','Struktur Dəyişiklikləri',         'Pashapay',            'Qönçədən gözlənilir',    'Gözləyir', 'Yüksək','Nərgiz, İlaha',         '','',        '2026-04-20T00:00:00Z',now],
    ['t054','p12','Struktur Dəyişiklikləri',         'Birmarket',           'BP-lər, OPCO',           'Gözləyir', 'Yüksək','Aytən',                 '','',        '2026-04-20T00:00:00Z',now],
    // p13 - Pashapay HR Diaqnostika
    ['t055','p13','Pashapay HR Diaqnostika',         'Əmək münasibətləri',  '',                       'Tamamlandı','Orta', 'Nizami Tahirov',         '2026-04-21','','2026-04-20T00:00:00Z',now],
    ['t056','p13','Pashapay HR Diaqnostika',         'Əmək haqqı və ödənişlər','',                   'Tamamlandı','Orta', 'Nizami Tahirov',         '2026-04-21','','2026-04-20T00:00:00Z',now],
    ['t057','p13','Pashapay HR Diaqnostika',         'HR Data',             '',                       'Tamamlandı','Orta', 'Nizami Tahirov',         '2026-04-21','','2026-04-20T00:00:00Z',now],
    ['t058','p13','Pashapay HR Diaqnostika',         'HRIS Sistem',         '',                       'Tamamlandı','Orta', 'Nizami Tahirov',         '2026-04-21','','2026-04-20T00:00:00Z',now],
  ];
  tSheet.getRange(2, 1, tasks.length, TASK_HEADERS.length).setValues(tasks);

  return { success: true, data: 'Excel datası uğurla idxal edildi: ' + projects.length + ' layihə, ' + tasks.length + ' tapşırıq, ' + teamData.length + ' komanda üzvü' };
}
