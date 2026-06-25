/**
 * SIMKA GenBI UNG Backend Script
 * File: Code.gs
 * Description: Core backend logic, routing, LockService transactions, and backup.
 */

// Include utility to load HTML files (CSS, JS) into Index.html template
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Main web app routing entry point
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('SIMKA GenBI UNG')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ----------------------------------------------------
// DATABASE INITIALIZATION HELPER
// ----------------------------------------------------
function initializeSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Sheet 1: Anggota
  var sheetAnggota = ss.getSheetByName("Anggota");
  if (!sheetAnggota) {
    sheetAnggota = ss.insertSheet("Anggota");
    sheetAnggota.appendRow([
      "id",
      "nama",
      "nim",
      "divisi",
      "penerimaanKe",
      "jabatan",
      "panitia",
      "delegasiKegiatan",
      "delegasiPeserta",
      "pin",
      "rekeningBNI"
    ]);
    
    // Add default admin/operators for testing
    sheetAnggota.appendRow([1, "Ketua Komisariat", "11111", "BPH", 1, "Ketua", 0, 0, 0, "1234", ""]);
    sheetAnggota.appendRow([2, "Sekretaris Komisariat", "22222", "BPH", 1, "Sekretaris", 0, 0, 0, "5678", ""]);
    sheetAnggota.appendRow([3, "Bendahara Komisariat", "33333", "BPH", 1, "Bendahara", 0, 0, 0, "9999", ""]);
    sheetAnggota.appendRow([4, "Kadiv Pendidikan", "44444", "Pendidikan", 1, "Kadiv", 0, 0, 0, "1111", ""]);
  }
  
  // Sheet 2: Kegiatan_Log
  var sheetKegiatan = ss.getSheetByName("Kegiatan_Log");
  if (!sheetKegiatan) {
    sheetKegiatan = ss.insertSheet("Kegiatan_Log");
    sheetKegiatan.appendRow([
      "timestamp",
      "namaProker",
      "idAnggota",
      "namaAnggota",
      "peran",
      "operator"
    ]);
  }
  
  // Sheet 3: Penilaian_Log
  var sheetPenilaian = ss.getSheetByName("Penilaian_Log");
  if (!sheetPenilaian) {
    sheetPenilaian = ss.insertSheet("Penilaian_Log");
    sheetPenilaian.appendRow([
      "timestamp",
      "bulan",
      "idPenerima",
      "namaPenerima",
      "jabatanPenerima",
      "nilai",
      "catatan",
      "idPenilai",
      "operator"
    ]);
  }
  
  // Delete sheet default "Sheet1" if it exists and we created others
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
  
  initializeNewSheets();
  
  return "Database SIMKA GenBI UNG berhasil diinisialisasi! Data default operator ditambahkan (PIN Ketua: 1234, Sekretaris: 5678).";
}

// ----------------------------------------------------
// GETTERS (READ OPERATIONS - NO LOCK REQUIRED)
// ----------------------------------------------------
function getSemuaAnggota() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Anggota");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var sheetKegiatan = ss.getSheetByName("Kegiatan");
  var sheetPartisipasi = ss.getSheetByName("Partisipasi_Kegiatan");
  
  var useDynamic = false;
  var keaktifanMap = {};
  
  if (sheetKegiatan && sheetPartisipasi) {
    useDynamic = true;
    var kegiatanMap = {};
    var kData = sheetKegiatan.getDataRange().getValues();
    for (var k = 1; k < kData.length; k++) {
      kegiatanMap[kData[k][0]] = kData[k][3]; // ID -> Kategori
    }
    
    var pData = sheetPartisipasi.getDataRange().getValues();
    for (var p = 1; p < pData.length; p++) {
      var pNim = String(pData[p][1]);
      var kId = pData[p][2];
      var kat = kegiatanMap[kId] || "Kepanitiaan";
      
      if (!keaktifanMap[pNim]) {
        keaktifanMap[pNim] = { panitia: 0, delegasiKegiatan: 0, delegasiPeserta: 0 };
      }
      if (kat === "Kepanitiaan") {
        keaktifanMap[pNim].panitia++;
      } else if (kat === "Delegasi Kegiatan") {
        keaktifanMap[pNim].delegasiKegiatan++;
      } else if (kat === "Delegasi Peserta") {
        keaktifanMap[pNim].delegasiPeserta++;
      }
    }
  }
  
  var list = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var nim = String(row[2]);
    var panitiaVal = row[6] || 0;
    var delKegVal = row[7] || 0;
    var delPesVal = row[8] || 0;
    
    if (useDynamic) {
      var dyn = keaktifanMap[nim] || { panitia: 0, delegasiKegiatan: 0, delegasiPeserta: 0 };
      panitiaVal = dyn.panitia;
      delKegVal = dyn.delegasiKegiatan;
      delPesVal = dyn.delegasiPeserta;
    }
    
    list.push({
      id: row[0],
      nama: row[1],
      nim: nim,
      divisi: row[3],
      penerimaanKe: row[4],
      jabatan: row[5],
      panitia: panitiaVal,
      delegasiKegiatan: delKegVal,
      delegasiPeserta: delPesVal,
      rekeningBNI: row[10] || ""
    });
  }
  return list;
}

function getOperatorList() {
  var all = getSemuaAnggota();
  return all.filter(function(a) {
    return a.jabatan !== "Anggota";
  });
}

function validasiLoginOperator(id, pin) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Anggota");
  if (!sheet) throw new Error("Database 'Anggota' tidak ditemukan");
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] == id && String(row[9]).trim() === String(pin).trim()) {
      return {
        id: row[0],
        nama: row[1],
        nim: String(row[2]),
        divisi: row[3],
        penerimaanKe: row[4],
        jabatan: row[5]
      };
    }
  }
  throw new Error("PIN yang Anda masukkan salah.");
}

function getLogsKegiatanLimit(limit) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kegiatan_Log");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var list = [];
  var limitVal = limit || 50;
  var maxVal = Math.min(data.length - 1, limitVal);
  var timezone = Session.getScriptTimeZone();
  
  for (var i = data.length - 1; i >= data.length - maxVal; i--) {
    var row = data[i];
    list.push({
      timestamp: Utilities.formatDate(new Date(row[0]), timezone, "yyyy-MM-dd HH:mm:ss"),
      namaProker: row[1],
      idAnggota: row[2],
      namaAnggota: row[3],
      peran: row[4],
      operator: row[5]
    });
  }
  return list;
}

function getLogsPenilaianLimit(limit) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Penilaian_Log");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var list = [];
  var limitVal = limit || 50;
  var maxVal = Math.min(data.length - 1, limitVal);
  var timezone = Session.getScriptTimeZone();
  
  for (var i = data.length - 1; i >= data.length - maxVal; i--) {
    var row = data[i];
    list.push({
      timestamp: Utilities.formatDate(new Date(row[0]), timezone, "yyyy-MM-dd HH:mm:ss"),
      bulan: row[1],
      idPenerima: row[2],
      namaPenerima: row[3],
      jabatanPenerima: row[4],
      nilai: row[5],
      catatan: row[6],
      idPenilai: row[7],
      operator: row[8]
    });
  }
  return list;
}

function getRiwayatAnggota(idAnggota) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var kegiatanSheet = ss.getSheetByName("Kegiatan_Log");
  var penilaianSheet = ss.getSheetByName("Penilaian_Log");
  var timezone = Session.getScriptTimeZone();

  var kegiatanList = [];
  if (kegiatanSheet) {
    var data = kegiatanSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][2] == idAnggota) {
        kegiatanList.push({
          timestamp: Utilities.formatDate(new Date(data[i][0]), timezone, "yyyy-MM-dd HH:mm:ss"),
          namaProker: data[i][1],
          peran: data[i][4],
          operator: data[i][5]
        });
      }
    }
  }

  var penilaianList = [];
  if (penilaianSheet) {
    var data = penilaianSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][2] == idAnggota) {
        penilaianList.push({
          timestamp: Utilities.formatDate(new Date(data[i][0]), timezone, "yyyy-MM-dd HH:mm:ss"),
          bulan: data[i][1],
          nilai: data[i][5],
          catatan: data[i][6],
          idPenilai: data[i][7],
          operator: data[i][8]
        });
      }
    }
  }

  return {
    kegiatan: kegiatanList,
    penilaian: penilaianList
  };
}

// ----------------------------------------------------
// WRITE OPERATIONS (CONCURRENCY LOCK SERVICE: 30 SECONDS)
// ----------------------------------------------------
function toTitleCase(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, function(val) { return val.toUpperCase(); });
}

function cleanNIM(nim) {
  if (!nim) return "";
  return String(nim).replace(/\D/g, "");
}

function daftarAnggotaBaru(anggotaData, operatorName) {
  if (!operatorName) throw new Error("Akses ditolak: Nama operator tidak valid");
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30 seconds wait
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Anggota");
    if (!sheet) throw new Error("Database 'Anggota' tidak ditemukan");
    
    var data = sheet.getDataRange().getValues();
    var nim = cleanNIM(anggotaData.nim);
    var nama = toTitleCase(anggotaData.nama.trim());
    var divisi = anggotaData.divisi;
    var penerimaanKe = Number(anggotaData.penerimaanKe);
    var jabatan = anggotaData.jabatan || "Anggota";
    var pin = anggotaData.pin ? String(anggotaData.pin).trim() : "";
    
    // Validate duplicate NIM
    var maxId = 0;
    for (var i = 1; i < data.length; i++) {
      var rowId = Number(data[i][0]);
      if (rowId > maxId) maxId = rowId;
      if (cleanNIM(data[i][2]) === nim && nim !== "") {
        throw new Error("Anggota dengan NIM " + nim + " sudah terdaftar di database.");
      }
    }
    
    var newId = maxId + 1;
    sheet.appendRow([
      newId,
      nama,
      nim,
      divisi,
      penerimaanKe,
      jabatan,
      0, // panitia default
      0, // delegasiKegiatan default
      0, // delegasiPeserta default
      pin,
      anggotaData.rekeningBNI ? String(anggotaData.rekeningBNI).trim() : ""
    ]);
    
    return { success: true, id: newId, nama: nama };
  } catch (e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock(); // Safely release lock
  }
}

function catatPenugasanBaru(kegiatanDataList, operatorName) {
  if (!operatorName) throw new Error("Akses ditolak: Nama operator tidak valid");
  if (!kegiatanDataList || kegiatanDataList.length === 0) throw new Error("Data penugasan kosong.");
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30 seconds wait
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var anggotaSheet = ss.getSheetByName("Anggota");
    var kegiatanSheet = ss.getSheetByName("Kegiatan_Log");
    if (!anggotaSheet || !kegiatanSheet) throw new Error("Database 'Anggota' atau 'Kegiatan_Log' tidak ditemukan");
    
    var anggotaData = anggotaSheet.getDataRange().getValues();
    var kegiatanData = kegiatanSheet.getDataRange().getValues();
    
    // Map members for fast count lookup
    var anggotaMap = {};
    for (var i = 1; i < anggotaData.length; i++) {
      anggotaMap[anggotaData[i][0]] = {
        rowIndex: i + 1,
        nim: String(anggotaData[i][2]),
        panitia: Number(anggotaData[i][6]) || 0,
        delegasiKegiatan: Number(anggotaData[i][7]) || 0,
        delegasiPeserta: Number(anggotaData[i][8]) || 0
      };
    }
    
    var logsToWrite = [];
    var increments = {}; // Track additions per member id
    
    for (var k = 0; k < kegiatanDataList.length; k++) {
      var item = kegiatanDataList[k];
      var namaProker = toTitleCase(item.namaProker.trim());
      var idAnggota = Number(item.idAnggota);
      var namaAnggota = item.namaAnggota;
      var peran = item.peran; // Panitia / Delegasi Kegiatan / Delegasi Peserta
      var itemDate = parseLocalDate(item.tanggal);
      
      // Concurrency/Duplicate check on sheet Kegiatan_Log
      var isDuplicate = false;
      for (var l = 1; l < kegiatanData.length; l++) {
        var row = kegiatanData[l];
        // B: namaProker, C: idAnggota, E: peran
        if (row[1] === namaProker && row[2] == idAnggota && row[4] === peran) {
          isDuplicate = true;
          break;
        }
      }
      // Check duplicate within the incoming list itself
      if (!isDuplicate) {
        for (var m = 0; m < logsToWrite.length; m++) {
          var logRow = logsToWrite[m];
          if (logRow[1] === namaProker && logRow[2] == idAnggota && logRow[4] === peran) {
            isDuplicate = true;
            break;
          }
        }
      }
      
      if (isDuplicate) {
        throw new Error("Pemberitahuan Duplikat: Anggota " + namaAnggota + " sudah tercatat di proker '" + namaProker + "' dengan peran '" + peran + "'.");
      }
      
      if (!anggotaMap[idAnggota]) {
        throw new Error("ID Anggota " + idAnggota + " tidak ditemukan.");
      }
      
      // Prepare log row
      logsToWrite.push([
        itemDate,
        namaProker,
        idAnggota,
        namaAnggota,
        peran,
        operatorName
      ]);
      
      // Track counts increment
      if (!increments[idAnggota]) {
        increments[idAnggota] = { panitia: 0, delegasiKegiatan: 0, delegasiPeserta: 0 };
      }
      
      if (peran === "Panitia") {
        increments[idAnggota].panitia += 1;
      } else if (peran === "Delegasi Kegiatan") {
        increments[idAnggota].delegasiKegiatan += 1;
      } else if (peran === "Delegasi Peserta") {
        increments[idAnggota].delegasiPeserta += 1;
      }
    }
    
    // Append all rows
    for (var n = 0; n < logsToWrite.length; n++) {
      kegiatanSheet.appendRow(logsToWrite[n]);
    }
    
    // Sync with the new Kegiatan and Partisipasi_Kegiatan sheets (dynamic keaktifan engine)
    var sheetNewK = ss.getSheetByName("Kegiatan");
    var sheetNewP = ss.getSheetByName("Partisipasi_Kegiatan");
    
    if (sheetNewK && sheetNewP) {
      var newKData = sheetNewK.getDataRange().getValues();
      var newPData = sheetNewP.getDataRange().getValues();
      
      // Build lookups of existing Kegiatan by name + kategori -> ID
      var existingKMap = {};
      for (var x = 1; x < newKData.length; x++) {
        var key = String(newKData[x][1]).trim().toLowerCase() + "_" + String(newKData[x][3]).trim().toLowerCase();
        existingKMap[key] = String(newKData[x][0]);
      }
      
      // Generate next KGT ID
      var nextKNum = 1;
      for (var x = 1; x < newKData.length; x++) {
        var match = String(newKData[x][0]).match(/KGT-(\d+)/);
        if (match) {
          var num = parseInt(match[1], 10);
          if (num >= nextKNum) nextKNum = num + 1;
        }
      }
      
      // Generate next PRT ID
      var nextPNum = 1;
      for (var x = 1; x < newPData.length; x++) {
        var match = String(newPData[x][0]).match(/PRT-(\d+)/);
        if (match) {
          var num = parseInt(match[1], 10);
          if (num >= nextPNum) nextPNum = num + 1;
        }
      }
      
      // Build lookups of existing Partisipasi by nim + kegiatan ID -> true
      var existingPMap = {};
      for (var x = 1; x < newPData.length; x++) {
        var key = String(newPData[x][1]) + "_" + String(newPData[x][2]);
        existingPMap[key] = true;
      }
      
      var newPartisipasisToAppend = [];
      
      for (var k = 0; k < kegiatanDataList.length; k++) {
        var item = kegiatanDataList[k];
        var namaProker = toTitleCase(item.namaProker.trim());
        var idAnggota = Number(item.idAnggota);
        var peran = item.peran;
        var itemDate = parseLocalDate(item.tanggal);
        var memberNim = anggotaMap[idAnggota] ? anggotaMap[idAnggota].nim : "";
        
        if (!memberNim) continue;
        
        var kategori = "Kepanitiaan";
        if (peran === "Delegasi Kegiatan") kategori = "Delegasi Kegiatan";
        else if (peran === "Delegasi Peserta") kategori = "Delegasi Peserta";
        
        var kKey = namaProker.toLowerCase() + "_" + kategori.toLowerCase();
        var kId = existingKMap[kKey];
        
        if (!kId) {
          kId = "KGT-" + String(nextKNum++).padStart(3, '0');
          existingKMap[kKey] = kId;
          
          sheetNewK.appendRow([
            kId,
            namaProker,
            itemDate,
            kategori
          ]);
        }
        
        var pKey = memberNim + "_" + kId;
        if (!existingPMap[pKey]) {
          var pId = "PRT-" + String(nextPNum++).padStart(4, '0');
          existingPMap[pKey] = true;
          
          newPartisipasisToAppend.push([
            pId,
            memberNim,
            kId
          ]);
        }
      }
      
      if (newPartisipasisToAppend.length > 0) {
        var pLastRow = sheetNewP.getLastRow();
        sheetNewP.getRange(pLastRow + 1, 1, newPartisipasisToAppend.length, 3).setValues(newPartisipasisToAppend);
      }
    }
    
    // Update master counters in Anggota sheet
    for (var idStr in increments) {
      var id = Number(idStr);
      var inc = increments[id];
      var member = anggotaMap[id];
      
      var newPanitia = member.panitia + inc.panitia;
      var newDelKegiatan = member.delegasiKegiatan + inc.delegasiKegiatan;
      var newDelPeserta = member.delegasiPeserta + inc.delegasiPeserta;
      
      anggotaSheet.getRange(member.rowIndex, 7).setValue(newPanitia);
      anggotaSheet.getRange(member.rowIndex, 8).setValue(newDelKegiatan);
      anggotaSheet.getRange(member.rowIndex, 9).setValue(newDelPeserta);
    }
    
    return { success: true, count: logsToWrite.length };
  } catch (e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  var parts = dateStr.split("-");
  if (parts.length === 3) {
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var day = parseInt(parts[2], 10);
    var now = new Date();
    return new Date(year, month, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  }
  return new Date();
}

function simpanPenilaianBulanan(penilaianDataList, operatorName) {
  if (!operatorName) throw new Error("Akses ditolak: Nama operator tidak valid");
  if (!penilaianDataList || penilaianDataList.length === 0) throw new Error("Data penilaian kosong.");
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30 seconds wait
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var anggotaSheet = ss.getSheetByName("Anggota");
    var penilaianSheet = ss.getSheetByName("Penilaian_Log");
    if (!anggotaSheet || !penilaianSheet) throw new Error("Database 'Anggota' atau 'Penilaian_Log' tidak ditemukan");
    
    var anggotaData = anggotaSheet.getDataRange().getValues();
    
    // Create member mapping to validate roles & divisions
    var anggotaMap = {};
    for (var i = 1; i < anggotaData.length; i++) {
      anggotaMap[anggotaData[i][0]] = {
        id: anggotaData[i][0],
        nama: anggotaData[i][1],
        divisi: anggotaData[i][3],
        jabatan: anggotaData[i][5]
      };
    }
    
    var timestamp = new Date();
    var rowsToWrite = [];
    
    for (var k = 0; k < penilaianDataList.length; k++) {
      var item = penilaianDataList[k];
      var idPenilai = Number(item.idPenilai);
      var idPenerima = Number(item.idPenerima);
      var nilai = Number(item.nilai);
      var catatan = item.catatan ? item.catatan.trim() : "";
      var bulan = item.bulan;
      
      var penilai = anggotaMap[idPenilai];
      var penerima = anggotaMap[idPenerima];
      
      if (!penilai) throw new Error("Evaluator (ID " + idPenilai + ") tidak terdaftar.");
      if (!penerima) throw new Error("Penerima Nilai (ID " + idPenerima + ") tidak terdaftar.");
      
      if (nilai < 1 || nilai > 5) {
        throw new Error("Nilai evaluasi harus berkisar antara 1 s.d. 5.");
      }
      
      // Backend Validation Rules (Grading Authorization Logic)
      if (penilai.jabatan === "Ketua") {
        // Ketua evaluates Sekretaris, Bendahara, Kadiv
        var validRoles = ["Sekretaris", "Bendahara", "Kadiv"];
        if (validRoles.indexOf(penerima.jabatan) === -1) {
          throw new Error("Ketua hanya berhak menilai BPH (Sekretaris/Bendahara) dan Kepala Divisi.");
        }
      } else if (penilai.jabatan === "Kadiv") {
        // Kadiv evaluates Anggota from their own division
        if (penerima.jabatan !== "Anggota") {
          throw new Error("Kadiv hanya berhak menilai Anggota taktis.");
        }
        if (penilai.divisi !== penerima.divisi) {
          throw new Error("Kadiv Divisi " + penilai.divisi + " hanya dapat menilai anggota dari divisi '" + penilai.divisi + "'.");
        }
      } else {
        throw new Error("Akses ditolak: Jabatan penilai tidak berwenang memberikan nilai bulanan.");
      }
      
      // Prepare log row: timestamp, bulan, idPenerima, namaPenerima, jabatanPenerima, nilai, catatan, idPenilai, operator
      rowsToWrite.push([
        timestamp,
        bulan,
        idPenerima,
        penerima.nama,
        penerima.jabatan,
        nilai,
        catatan,
        idPenilai,
        operatorName
      ]);
    }
    
    // Write rows to sheet
    for (var n = 0; n < rowsToWrite.length; n++) {
      penilaianSheet.appendRow(rowsToWrite[n]);
    }
    
    return { success: true, count: rowsToWrite.length };
  } catch (e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

// ----------------------------------------------------
// AUTOMATIC BACKUP (GOOGLE DRIVE)
// ----------------------------------------------------
function backupDatabaseOtomatis() {
  try {
    var properties = PropertiesService.getScriptProperties();
    var folderId = properties.getProperty("BACKUP_FOLDER_ID");
    var folder;
    
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (err) {
        // Fallback if ID is deleted or invalid
      }
    }
    
    if (!folder) {
      var folders = DriveApp.getFoldersByName("SIMKA_Backup");
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder("SIMKA_Backup");
      }
      properties.setProperty("BACKUP_FOLDER_ID", folder.getId());
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var file = DriveApp.getFileById(ss.getId());
    var formattedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HHmmss");
    var backupName = ss.getName() + "_Backup_" + formattedDate;
    
    file.makeCopy(backupName, folder);
    
    return {
      success: true,
      name: backupName,
      folderName: folder.getName(),
      folderUrl: folder.getUrl()
    };
  } catch (e) {
    throw new Error("Backup otomatis gagal: " + e.message);
  }
}

// ----------------------------------------------------
// BATCH DATA IMPORT FROM MASTER SPREADSHEET
// ----------------------------------------------------
// Helper to parse spreadsheet ID and GID from URL or raw ID
function parseSpreadsheetUrl(urlOrId) {
  if (!urlOrId) return { id: "", gid: "" };
  urlOrId = String(urlOrId).trim();
  
  var id = urlOrId;
  var gid = "";
  
  // If it's a full Google Sheets URL
  if (urlOrId.indexOf("docs.google.com/spreadsheets") > -1) {
    // Extract ID: matches /d/ followed by any alphanumeric character, dashes, or underscores
    var dMatch = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (dMatch) {
      id = dMatch[1];
    }
    // Extract GID: matches gid= followed by digits
    var gidMatch = urlOrId.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch) {
      gid = gidMatch[1];
    }
  }
  return { id: id, gid: gid };
}

// Helper to extract numeric Gelombang/Penerimaan from text (e.g. "Gelombang 4", "IV", "4")
function extractPenerimaanNumber(val) {
  if (val === null || val === undefined) return "";
  var str = String(val).trim().toUpperCase();
  if (str === "") return "";
  
  // 1. Try finding numeric digits
  var match = str.match(/\d+/);
  if (match) {
    return Number(match[0]);
  }
  
  // 2. Fallback to matching Roman numerals (I to X)
  var romanMap = { "VIII": 8, "VII": 7, "VI": 6, "IV": 4, "V": 5, "III": 3, "II": 2, "I": 1, "IX": 9, "X": 10 };
  for (var key in romanMap) {
    if (str.indexOf(key) > -1) {
      return romanMap[key];
    }
  }
  return "";
}

// Helper to standardize Division names matching the official list
function standardizeDivisi(divRaw) {
  if (!divRaw) return "";
  var d = String(divRaw).trim().toLowerCase();
  if (d.indexOf("pendidikan") > -1) return "Pendidikan";
  if (d.indexOf("kominfo") > -1 || d.indexOf("komunikasi") > -1) return "Kominfo";
  if (d.indexOf("lingkungan") > -1 || d.indexOf("hidup") > -1) return "Lingkungan Hidup";
  if (d.indexOf("kesehatan") > -1 || d.indexOf("masyarakat") > -1 || d.indexOf("kesmas") > -1) return "Kesehatan Masyarakat";
  if (d.indexOf("wirausaha") > -1 || d.indexOf("kewirausahaan") > -1) return "Kewirausahaan";
  if (d.indexOf("potensi") > -1 || d.indexOf("diri") > -1) return "Potensi Diri";
  if (d.indexOf("bph") > -1 || d.indexOf("harian") > -1) return "BPH";
  // Default TitleCase if none of the above matches
  return toTitleCase(divRaw);
}

function importGenbiDataFromSheet(urlOrId) {
  var targetSs = SpreadsheetApp.getActiveSpreadsheet();
  var sheetAnggota = targetSs.getSheetByName("Anggota");
  if (!sheetAnggota) {
    throw new Error("Sheet 'Anggota' tidak ditemukan. Harap inisialisasi database terlebih dahulu.");
  }
  
  // Default values if urlOrId is not provided
  var scriptProperties = PropertiesService.getScriptProperties();
  var defaultSsId = scriptProperties.getProperty("MASTER_SPREADSHEET_ID") || "YOUR_MASTER_SPREADSHEET_ID_PLACEHOLDER";
  var defaultGid = scriptProperties.getProperty("MASTER_SPREADSHEET_GID") || "YOUR_MASTER_GID_PLACEHOLDER";
  
  var parsed = parseSpreadsheetUrl(urlOrId);
  var sourceSsId = parsed.id || defaultSsId;
  var targetGid = parsed.gid || defaultGid;
  
  // Open the source spreadsheet by ID (read-only)
  var sourceSs;
  try {
    sourceSs = SpreadsheetApp.openById(sourceSsId);
  } catch (e) {
    throw new Error("Gagal mengakses spreadsheet sumber data. Pastikan spreadsheet tersebut dapat diakses oleh akun Anda (Anyone with link can view). Detail: " + e.message);
  }
  
  // Find sheet by GID
  var sourceSheet = null;
  var sheets = sourceSs.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId().toString() === targetGid.toString()) {
      sourceSheet = sheets[i];
      break;
    }
  }
  if (!sourceSheet) {
    // Fallback to first sheet
    sourceSheet = sheets[0];
  }
  
  var sourceData = sourceSheet.getDataRange().getValues();
  if (sourceData.length === 0) {
    throw new Error("Spreadsheet sumber kosong.");
  }
  
  // --- DYNAMIC HEADER SCANNING & COLUMN INDEX MAPPING ---
  var headerRowIndex = -1;
  var colIndices = {
    nim: -1,
    nama: -1,
    jabatan: -1,
    penerimaan: -1,
    divisi: -1
  };
  
  function cleanHeaderStr(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  }
  
  var maxHeaderRowsToCheck = Math.min(15, sourceData.length);
  var maxScore = -1;
  
  for (var r = 0; r < maxHeaderRowsToCheck; r++) {
    var row = sourceData[r];
    var tempIndices = { nim: -1, nama: -1, jabatan: -1, penerimaan: -1, divisi: -1 };
    var score = 0;
    
    for (var c = 0; c < row.length; c++) {
      var cellVal = cleanHeaderStr(row[c]);
      if (!cellVal) continue;
      
      if (cellVal === "nim" || cellVal.indexOf("induk") > -1 || cellVal.indexOf("nim") > -1) {
        tempIndices.nim = c;
        score += 3;
      } else if (cellVal.indexOf("nama") > -1) {
        tempIndices.nama = c;
        score += 3;
      } else if (cellVal.indexOf("jabatan") > -1 || cellVal === "peran" || cellVal === "posisi") {
        tempIndices.jabatan = c;
        score += 3;
      } else if (cellVal.indexOf("penerimaan") > -1 || cellVal.indexOf("gelombang") > -1 || cellVal.indexOf("angkatan") > -1) {
        tempIndices.penerimaan = c;
        score += 2;
      } else if (cellVal.indexOf("divisi") > -1) {
        tempIndices.divisi = c;
        score += 2;
      }
    }
    
    // Valid header row must contain nama and nim
    if (tempIndices.nama !== -1 && tempIndices.nim !== -1) {
      if (score > maxScore) {
        maxScore = score;
        headerRowIndex = r;
        colIndices = tempIndices;
      }
    }
  }
  
  // Fallback to old hardcoded offsets if scanning failed
  if (headerRowIndex === -1) {
    headerRowIndex = 3; // 4th row (0-indexed 3)
    colIndices = {
      nim: 1,       // Column B
      nama: 2,      // Column C
      jabatan: 4,   // Column E
      penerimaan: -1,
      divisi: -1
    };
  }
  
  var importedCount = 0;
  var bphPinMap = {
    "Ketua": "1234",
    "Sekretaris": "5678",
    "Bendahara": "9999"
  };
  
  var rowsToAppend = [];
  var currentId = 1;
  
  // Lock write operation to avoid concurrency conflicts
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    // Clear all rows except headers
    var lastRow = sheetAnggota.getLastRow();
    if (lastRow > 1) {
      sheetAnggota.deleteRows(2, lastRow - 1);
    }
    
    for (var i = headerRowIndex + 1; i < sourceData.length; i++) {
      var row = sourceData[i];
      
      var nimRaw = colIndices.nim !== -1 ? String(row[colIndices.nim]).trim() : "";
      var namaRaw = colIndices.nama !== -1 ? String(row[colIndices.nama]).trim() : "";
      var jabatanRaw = colIndices.jabatan !== -1 ? String(row[colIndices.jabatan]).trim() : "";
      var penerimaanRaw = colIndices.penerimaan !== -1 ? String(row[colIndices.penerimaan]).trim() : "";
      var divisiRaw = colIndices.divisi !== -1 ? String(row[colIndices.divisi]).trim() : "";
      
      if (!namaRaw || (!jabatanRaw && !divisiRaw)) continue;
      
      // Clean NIM: remove non-digits
      var nimClean = nimRaw.replace(/\D/g, "");
      
      // Capitalize Name
      var nama = toTitleCase(namaRaw);
      
      // Parse Gelombang Penerimaan
      var penerimaanKe = extractPenerimaanNumber(penerimaanRaw);
      
      // Parse Divisi & Jabatan
      var divisi = "Pendidikan";
      var jabatan = "Anggota";
      
      var jLow = jabatanRaw.toLowerCase();
      if (jLow.indexOf("ketua") > -1) {
        divisi = "BPH";
        jabatan = "Ketua";
      } else if (jLow.indexOf("sekretaris") > -1) {
        divisi = "BPH";
        jabatan = "Sekretaris";
      } else if (jLow.indexOf("bendahara") > -1) {
        divisi = "BPH";
        jabatan = "Bendahara";
      } else if (jLow.indexOf("kadiv") > -1 || jLow.indexOf("kepala divisi") > -1 || jLow.indexOf("koordinator") > -1) {
        jabatan = "Kadiv";
        var divName = jabatanRaw.replace(/(Kadiv|Kepala Divisi|Koordinator)/i, "").trim();
        divisi = standardizeDivisi(divName);
      } else {
        jabatan = "Anggota";
        if (colIndices.divisi !== -1 && divisiRaw) {
          divisi = standardizeDivisi(divisiRaw);
        } else if (jLow.indexOf("anggota divisi") > -1) {
          var divName = jabatanRaw.replace(/Anggota Divisi/i, "").trim();
          divisi = standardizeDivisi(divName);
        } else {
          // If neither works, try parsing division from the jabatanRaw directly
          divisi = standardizeDivisi(jabatanRaw) || "Pendidikan";
        }
      }
      
      // Assign default PIN for BPH/Kadiv
      var pin = "";
      if (divisi === "BPH") {
        pin = bphPinMap[jabatan] || "1234";
      } else if (jabatan === "Kadiv") {
        pin = "1111"; // Default PIN for Kadiv
      }
      
      rowsToAppend.push([
        currentId++,
        nama,
        nimClean,
        divisi,
        penerimaanKe,
        jabatan,
        0, // panitia
        0, // delegasiKegiatan
        0, // delegasiPeserta
        pin,
        ""
      ]);
      importedCount++;
    }
    
    // Batch write to sheet
    if (rowsToAppend.length > 0) {
      var range = sheetAnggota.getRange(2, 1, rowsToAppend.length, 11);
      range.setValues(rowsToAppend);
    }
  } finally {
    lock.releaseLock();
  }
  
  var sourceDesc = urlOrId ? "dari spreadsheet kustom yang Anda masukkan" : "dari spreadsheet master default";
  return "Sukses mengimpor " + importedCount + " data anggota GenBI " + sourceDesc + "! Seluruh data lama di sheet 'Anggota' telah diperbarui. PIN login disiapkan (BPH Ketua: 1234, Sek: 5678, Ben: 9999, seluruh Kadiv: 1111).";
}

function syncRekeningFromSourceSheet(urlOrId) {
  if (!urlOrId) {
    throw new Error("URL Spreadsheet wajib diisi.");
  }
  
  var targetSs = SpreadsheetApp.getActiveSpreadsheet();
  var sheetAnggota = targetSs.getSheetByName("Anggota");
  if (!sheetAnggota) {
    throw new Error("Sheet 'Anggota' tidak ditemukan.");
  }
  
  var parsed = parseSpreadsheetUrl(urlOrId);
  var sourceSsId = parsed.id;
  var targetGid = parsed.gid;
  
  if (!sourceSsId) {
    throw new Error("ID Spreadsheet tidak valid. Harap periksa URL yang Anda masukkan.");
  }
  
  var sourceSs;
  try {
    sourceSs = SpreadsheetApp.openById(sourceSsId);
  } catch (e) {
    throw new Error("Gagal mengakses spreadsheet sumber. Pastikan spreadsheet tersebut disetel 'Anyone with the link can view' (Siapa saja dengan link dapat melihat). Detail: " + e.message);
  }
  
  var sourceSheet = null;
  var sheets = sourceSs.getSheets();
  if (targetGid) {
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId().toString() === targetGid.toString()) {
        sourceSheet = sheets[i];
        break;
      }
    }
  }
  if (!sourceSheet) {
    sourceSheet = sheets[0];
  }
  
  var sourceData = sourceSheet.getDataRange().getValues();
  if (sourceData.length === 0) {
    throw new Error("Spreadsheet sumber kosong.");
  }
  
  // Dynamic header scanning
  var headerRowIndex = -1;
  var colIndices = {
    nim: -1,
    nama: -1,
    rekening: -1
  };
  
  function cleanHeaderStr(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  }
  
  var maxHeaderRowsToCheck = Math.min(15, sourceData.length);
  var maxScore = -1;
  
  for (var r = 0; r < maxHeaderRowsToCheck; r++) {
    var row = sourceData[r];
    var tempIndices = { nim: -1, nama: -1, rekening: -1 };
    var score = 0;
    
    for (var c = 0; c < row.length; c++) {
      var cellVal = cleanHeaderStr(row[c]);
      if (!cellVal) continue;
      
      if (cellVal.indexOf("rekening") > -1 || cellVal.indexOf("rek") > -1 || cellVal.indexOf("bni") > -1) {
        tempIndices.rekening = c;
        score += 3;
      } else if (cellVal === "nim" || cellVal.indexOf("induk") > -1 || cellVal.indexOf("nim") > -1) {
        tempIndices.nim = c;
        score += 3;
      } else if (cellVal.indexOf("nama") > -1) {
        tempIndices.nama = c;
        score += 3;
      }
    }
    
    // We must find at least name/NIM and rekening
    if ((tempIndices.nama !== -1 || tempIndices.nim !== -1) && tempIndices.rekening !== -1) {
      if (score > maxScore) {
        maxScore = score;
        headerRowIndex = r;
        colIndices = tempIndices;
      }
    }
  }
  
  if (headerRowIndex === -1) {
    throw new Error("Gagal mendeteksi kolom rekening BNI dan kolom identitas (NIM/Nama) pada spreadsheet sumber. Harap pastikan baris judul berisi kata 'NIM', 'Nama', dan 'Rekening'.");
  }
  
  // Load existing database
  var anggotaData = sheetAnggota.getDataRange().getValues();
  if (anggotaData.length <= 1) {
    throw new Error("Database anggota kosong. Impor data anggota terlebih dahulu.");
  }
  
  var syncCount = 0;
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    // Create a mapping of NIM -> row index (0-indexed) in sheetAnggota
    var nimToRowIndex = {};
    var nameToRowIndex = {};
    
    for (var i = 1; i < anggotaData.length; i++) {
      var row = anggotaData[i];
      var nim = String(row[2]).trim(); // NIM is column C
      var name = String(row[1]).trim().toLowerCase(); // Name is column B
      if (nim) {
        nimToRowIndex[nim] = i + 1; // 1-indexed row number
      }
      if (name) {
        nameToRowIndex[name] = i + 1;
      }
    }
    
    // Update the values
    for (var i = headerRowIndex + 1; i < sourceData.length; i++) {
      var row = sourceData[i];
      var nimRaw = colIndices.nim !== -1 ? String(row[colIndices.nim]).trim() : "";
      var namaRaw = colIndices.nama !== -1 ? String(row[colIndices.nama]).trim() : "";
      var rekeningRaw = colIndices.rekening !== -1 ? String(row[colIndices.rekening]).trim() : "";
      
      if (!rekeningRaw) continue;
      
      var nimClean = nimRaw.replace(/\D/g, "");
      var nameClean = namaRaw.trim().toLowerCase();
      var rekeningClean = rekeningRaw.replace(/\D/g, ""); // Clean non-digits from account number
      
      var targetRow = -1;
      if (nimClean && nimToRowIndex[nimClean]) {
        targetRow = nimToRowIndex[nimClean];
      } else if (nameClean && nameToRowIndex[nameClean]) {
        targetRow = nameToRowIndex[nameClean];
      }
      
      if (targetRow !== -1) {
        sheetAnggota.getRange(targetRow, 11).setValue(rekeningClean); // Column K (11) is rekeningBNI
        syncCount++;
      }
    }
  } finally {
    lock.releaseLock();
  }
  
  return "Sukses mencocokkan dan menyinkronkan " + syncCount + " nomor rekening BNI anggota ke database SIMKA.";
}

// ----------------------------------------------------
// MONTHLY ACTIVITY RECAP STATISTICS
// ----------------------------------------------------
function getRekapKegiatanBulanan() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kegiatan_Log");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  // Group activities by Month and Year
  var groups = {};
  
  // Header: timestamp, namaProker, idAnggota, namaAnggota, peran, operator
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[0];
    var proker = row[1];
    var idAnggota = row[2];
    
    if (!dateVal || !proker) continue;
    
    // Parse date
    var date = new Date(dateVal);
    if (isNaN(date.getTime())) continue; // invalid date
    
    // Get month name in Indonesian
    var monthsIndo = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    var monthName = monthsIndo[date.getMonth()];
    var year = date.getFullYear();
    var monthKey = monthName + " " + year;
    
    if (!groups[monthKey]) {
      groups[monthKey] = {
        month: monthKey,
        monthIndex: date.getFullYear() * 12 + date.getMonth(), // for sorting
        totalInvolvements: 0,
        uniqueProkers: {},
        membersInvolved: {}
      };
    }
    
    groups[monthKey].totalInvolvements++;
    groups[monthKey].uniqueProkers[proker] = true;
    groups[monthKey].membersInvolved[idAnggota] = true;
  }
  
  // Convert groups object to array and sort by month index descending
  var result = [];
  for (var key in groups) {
    var g = groups[key];
    var prokerList = Object.keys(g.uniqueProkers);
    var memberCount = Object.keys(g.membersInvolved).length;
    
    result.push({
      month: g.month,
      monthIndex: g.monthIndex,
      totalInvolvements: g.totalInvolvements,
      prokerCount: prokerList.length,
      prokers: prokerList.join(", "),
      memberCount: memberCount
    });
  }
  
  result.sort(function(a, b) {
    return b.monthIndex - a.monthIndex; // latest month first
  });
  
  return result;
}

// ----------------------------------------------------
// POP-UP DETAIL PARTICIPANTS BY MONTH
// ----------------------------------------------------
function getParticipantsByMonth(monthKey) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kegiatan_Log");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var monthsIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  var participants = [];
  var seen = {}; // To group by member ID
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[0];
    if (!dateVal) continue;
    var date = new Date(dateVal);
    if (isNaN(date.getTime())) continue;
    
    var mName = monthsIndo[date.getMonth()];
    var year = date.getFullYear();
    var key = mName + " " + year;
    
    if (key === monthKey) {
      var id = row[2];
      var name = row[3];
      var proker = row[1];
      var role = row[4];
      
      if (!seen[id]) {
        seen[id] = {
          id: id,
          nama: name,
          activities: []
        };
        participants.push(seen[id]);
      }
      seen[id].activities.push({ proker: proker, peran: role });
    }
  }
  
  // Enrich with Division and NIM from Anggota sheet
  var anggotaSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Anggota");
  if (anggotaSheet) {
    var aData = anggotaSheet.getDataRange().getValues();
    var aMap = {};
    for (var j = 1; j < aData.length; j++) {
      aMap[aData[j][0]] = {
        nim: String(aData[j][2]),
        divisi: aData[j][3]
      };
    }
    
    for (var k = 0; k < participants.length; k++) {
      var p = participants[k];
      if (aMap[p.id]) {
        p.nim = aMap[p.id].nim;
        p.divisi = aMap[p.id].divisi;
      } else {
        p.nim = "-";
        p.divisi = "-";
      }
    }
  }
  
  return participants;
}

// ----------------------------------------------------
// GRADING ACCESS MONTH CONFIGURATION (SECRETARY ROLE)
// ----------------------------------------------------
function getActiveGradingMonth() {
  var props = PropertiesService.getScriptProperties();
  var month = props.getProperty("ACTIVE_GRADING_MONTH");
  if (!month) {
    var monthsIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    month = monthsIndo[new Date().getMonth()];
  }
  return month;
}

function saveActiveGradingMonth(monthName, operatorRole) {
  if (operatorRole !== "Sekretaris") {
    throw new Error("Akses ditolak: Hanya Sekretaris yang dapat memberikan akses/mengaktifkan bulan penilaian.");
  }
  var props = PropertiesService.getScriptProperties();
  props.setProperty("ACTIVE_GRADING_MONTH", monthName);
  return "Bulan penilaian untuk '" + monthName + "' berhasil diaktifkan! Ketua & Kadiv sekarang hanya dapat menilai di bulan ini.";
}

// ----------------------------------------------------
// UNIQUE MONTHS FOR RECAP FILTERING
// ----------------------------------------------------
function getUniqueRecapMonths() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kegiatan_Log");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var monthsIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  var seen = {};
  var list = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[0];
    if (!dateVal) continue;
    var date = new Date(dateVal);
    if (isNaN(date.getTime())) continue;
    
    var mName = monthsIndo[date.getMonth()];
    var year = date.getFullYear();
    var key = mName + " " + year;
    var monthIndex = date.getFullYear() * 12 + date.getMonth();
    
    if (!seen[key]) {
      seen[key] = true;
      list.push({
        month: key,
        monthIndex: monthIndex
      });
    }
  }
  
  list.sort(function(a, b) {
    return b.monthIndex - a.monthIndex; // latest month first
  });
  
  return list.map(function(item) { return item.month; });
}

// ----------------------------------------------------
// ACTIVITIES/PROKERS OF A SPECIFIC MONTH
// ----------------------------------------------------
function getActivitiesByMonth(monthKey) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kegiatan_Log");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var monthsIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  var activitiesMap = {};
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[0];
    if (!dateVal) continue;
    var date = new Date(dateVal);
    if (isNaN(date.getTime())) continue;
    
    var mName = monthsIndo[date.getMonth()];
    var year = date.getFullYear();
    var key = mName + " " + year;
    
    if (monthKey === "Semua" || key === monthKey) {
      var prokerName = row[1];
      var operator = row[5];
      
      if (!activitiesMap[prokerName]) {
        activitiesMap[prokerName] = {
          namaProker: prokerName,
          participantCount: 0,
          operator: operator,
          monthKey: key
        };
      }
      activitiesMap[prokerName].participantCount++;
    }
  }
  
  var result = [];
  for (var name in activitiesMap) {
    result.push(activitiesMap[name]);
  }
  return result;
}

// ----------------------------------------------------
// COMMITTEE MEMBERS LIST FOR A SPECIFIC PROKER
// ----------------------------------------------------
function getParticipantsByProker(prokerName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kegiatan_Log");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var participants = [];
  var seenIds = {}; // to avoid duplicates if any
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[1] === prokerName) {
      var id = row[2];
      var name = row[3];
      var peran = row[4];
      var operator = row[5];
      
      var uniqueKey = id + "_" + peran; // allow same member with multiple roles if exists, else group
      if (!seenIds[uniqueKey]) {
        seenIds[uniqueKey] = true;
        participants.push({
          id: id,
          nama: name,
          peran: peran,
          operator: operator
        });
      }
    }
  }
  
  // Enrich with Division and NIM from Anggota sheet
  var anggotaSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Anggota");
  if (anggotaSheet) {
    var aData = anggotaSheet.getDataRange().getValues();
    var aMap = {};
    for (var j = 1; j < aData.length; j++) {
      aMap[aData[j][0]] = {
        nim: String(aData[j][2]),
        divisi: aData[j][3]
      };
    }
    
    for (var k = 0; k < participants.length; k++) {
      var p = participants[k];
      if (aMap[p.id]) {
        p.nim = aMap[p.id].nim;
        p.divisi = aMap[p.id].divisi;
      } else {
        p.nim = "-";
        p.divisi = "-";
      }
    }
  }
  
  return participants;
}

function initializeNewSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Ensure Anggota has column K (rekeningBNI)
  var sheetAnggota = ss.getSheetByName("Anggota");
  if (sheetAnggota) {
    var headers = sheetAnggota.getRange(1, 1, 1, Math.max(1, sheetAnggota.getLastColumn())).getValues()[0];
    if (headers.indexOf("rekeningBNI") === -1) {
      sheetAnggota.getRange(1, 11).setValue("rekeningBNI");
    }
  } else {
    initializeSpreadsheet();
  }
  
  // 2. Sheet Kegiatan
  var sheetKegiatan = ss.getSheetByName("Kegiatan");
  if (!sheetKegiatan) {
    sheetKegiatan = ss.insertSheet("Kegiatan");
    sheetKegiatan.appendRow([
      "ID_Kegiatan",
      "Nama_Kegiatan",
      "Tanggal_Kegiatan",
      "Kategori"
    ]);
  }
  
  // 3. Sheet Partisipasi_Kegiatan
  var sheetPartisipasi = ss.getSheetByName("Partisipasi_Kegiatan");
  if (!sheetPartisipasi) {
    sheetPartisipasi = ss.insertSheet("Partisipasi_Kegiatan");
    sheetPartisipasi.appendRow([
      "ID_Partisipasi",
      "NIM_Anggota",
      "ID_Kegiatan"
    ]);
  }
  
  // 4. Sheet Kas
  var sheetKas = ss.getSheetByName("Kas");
  if (!sheetKas) {
    sheetKas = ss.insertSheet("Kas");
    sheetKas.appendRow([
      "ID_Kas",
      "NIM_Anggota",
      "Semester",
      "Tahun_Akademik",
      "Status",
      "Tanggal_Bayar"
    ]);
  }
  
  return "Inisialisasi tabel baru berhasil!";
}

function simpanKegiatanDanPartisipasi(dataKegiatan, listNIM, operatorName) {
  if (!operatorName) throw new Error("Akses ditolak: Nama operator tidak valid");
  if (!dataKegiatan || !dataKegiatan.namaKegiatan || !dataKegiatan.kategori || !dataKegiatan.tanggalKegiatan) {
    throw new Error("Data kegiatan tidak lengkap.");
  }
  if (!listNIM || listNIM.length === 0) {
    throw new Error("Pilih minimal satu anggota partisipan.");
  }
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetK = ss.getSheetByName("Kegiatan");
    var sheetP = ss.getSheetByName("Partisipasi_Kegiatan");
    var sheetA = ss.getSheetByName("Anggota");
    
    if (!sheetK || !sheetP || !sheetA) {
      throw new Error("Sheet Kegiatan, Partisipasi_Kegiatan, atau Anggota tidak ditemukan.");
    }
    
    // Validate NIMs exist in Anggota
    var aData = sheetA.getDataRange().getValues();
    var existingNIMs = {};
    for (var i = 1; i < aData.length; i++) {
      existingNIMs[cleanNIM(aData[i][2])] = true;
    }
    
    for (var k = 0; k < listNIM.length; k++) {
      var cleanNimVal = cleanNIM(listNIM[k]);
      if (!existingNIMs[cleanNimVal]) {
        throw new Error("NIM " + listNIM[k] + " tidak terdaftar di database Anggota.");
      }
    }
    
    // Generate ID Kegiatan (KGT-XXX)
    var nextIdNum = 1;
    var kData = sheetK.getDataRange().getValues();
    for (var i = 1; i < kData.length; i++) {
      var idStr = String(kData[i][0]);
      var match = idStr.match(/KGT-(\d+)/);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num >= nextIdNum) nextIdNum = num + 1;
      }
    }
    var idKegiatan = "KGT-" + String(nextIdNum).padStart(3, '0');
    
    // Parse Tanggal
    var tanggalVal = new Date(dataKegiatan.tanggalKegiatan);
    
    // Append to Kegiatan
    sheetK.appendRow([
      idKegiatan,
      dataKegiatan.namaKegiatan.trim(),
      tanggalVal,
      dataKegiatan.kategori
    ]);
    
    // Append to Partisipasi_Kegiatan (Batch)
    var nextPrtNum = 1;
    var pData = sheetP.getDataRange().getValues();
    for (var j = 1; j < pData.length; j++) {
      var idStr = String(pData[j][0]);
      var match = idStr.match(/PRT-(\d+)/);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num >= nextPrtNum) nextPrtNum = num + 1;
      }
    }
    
    var rowsToAppend = [];
    for (var k = 0; k < listNIM.length; k++) {
      var idPartisipasi = "PRT-" + String(nextPrtNum++).padStart(4, '0');
      rowsToAppend.push([
        idPartisipasi,
        cleanNIM(listNIM[k]),
        idKegiatan
      ]);
    }
    
    var lastRow = sheetP.getLastRow();
    sheetP.getRange(lastRow + 1, 1, rowsToAppend.length, 3).setValues(rowsToAppend);
    
    console.log("Operator " + operatorName + " menyimpan kegiatan " + idKegiatan + " dengan " + listNIM.length + " partisipan.");
    return { success: true, idKegiatan: idKegiatan, count: listNIM.length };
  } finally {
    lock.releaseLock();
  }
}

function hitungKeaktifanDinamis(nim) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetK = ss.getSheetByName("Kegiatan");
  var sheetP = ss.getSheetByName("Partisipasi_Kegiatan");
  
  var panitia = 0;
  var delegasiKegiatan = 0;
  var delegasiPeserta = 0;
  
  if (!sheetP || !sheetK) {
    return { panitia: 0, delegasiKegiatan: 0, delegasiPeserta: 0, total: 0 };
  }
  
  var kMap = {};
  var kData = sheetK.getDataRange().getValues();
  for (var i = 1; i < kData.length; i++) {
    kMap[kData[i][0]] = kData[i][3]; // ID -> Kategori
  }
  
  var pData = sheetP.getDataRange().getValues();
  var cleanNimInput = cleanNIM(nim);
  for (var j = 1; j < pData.length; j++) {
    if (cleanNIM(pData[j][1]) === cleanNimInput) {
      var kId = pData[j][2];
      var kat = kMap[kId];
      if (kat === "Kepanitiaan") panitia++;
      else if (kat === "Delegasi Kegiatan") delegasiKegiatan++;
      else if (kat === "Delegasi Peserta") delegasiPeserta++;
    }
  }
  
  return {
    panitia: panitia,
    delegasiKegiatan: delegasiKegiatan,
    delegasiPeserta: delegasiPeserta,
    total: panitia + delegasiKegiatan + delegasiPeserta
  };
}

function getSemuaKegiatan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetK = ss.getSheetByName("Kegiatan");
  var sheetP = ss.getSheetByName("Partisipasi_Kegiatan");
  if (!sheetK) return [];
  
  var kData = sheetK.getDataRange().getValues();
  if (kData.length <= 1) return [];
  
  var partMap = {};
  if (sheetP) {
    var pData = sheetP.getDataRange().getValues();
    for (var j = 1; j < pData.length; j++) {
      var kId = pData[j][2];
      var nim = String(pData[j][1]);
      if (!partMap[kId]) partMap[kId] = [];
      partMap[kId].push(nim);
    }
  }
  
  var list = [];
  for (var i = 1; i < kData.length; i++) {
    var row = kData[i];
    var dateVal = row[2];
    var formattedDate = "";
    if (dateVal instanceof Date) {
      var year = dateVal.getFullYear();
      var month = String(dateVal.getMonth() + 1).padStart(2, '0');
      var day = String(dateVal.getDate()).padStart(2, '0');
      formattedDate = year + "-" + month + "-" + day;
    } else if (dateVal) {
      formattedDate = String(dateVal);
    }
    
    list.push({
      id: row[0],
      nama: row[1],
      tanggal: formattedDate,
      kategori: row[3],
      partisipan: partMap[row[0]] || []
    });
  }
  return list;
}

function getDataBendahara(semester, tahunAkademik) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetAnggota = ss.getSheetByName("Anggota");
  var sheetKas = ss.getSheetByName("Kas");
  
  if (!sheetAnggota) return [];
  
  var aData = sheetAnggota.getDataRange().getValues();
  if (aData.length <= 1) return [];
  
  var kasMap = {};
  if (sheetKas) {
    var kData = sheetKas.getDataRange().getValues();
    for (var i = 1; i < kData.length; i++) {
      var kNim = String(kData[i][1]);
      var kSem = String(kData[i][2]);
      var kYear = String(kData[i][3]);
      var kStatus = String(kData[i][4]);
      var kDateVal = kData[i][5];
      var kDateStr = "";
      if (kDateVal instanceof Date) {
        var year = kDateVal.getFullYear();
        var month = String(kDateVal.getMonth() + 1).padStart(2, '0');
        var day = String(kDateVal.getDate()).padStart(2, '0');
        kDateStr = year + "-" + month + "-" + day;
      } else if (kDateVal) {
        kDateStr = String(kDateVal);
      }
      
      if (kSem === semester && kYear === tahunAkademik) {
        kasMap[kNim] = {
          status: kStatus,
          tanggalBayar: kDateStr
        };
      }
    }
  }
  
  var list = [];
  for (var j = 1; j < aData.length; j++) {
    var row = aData[j];
    var nim = String(row[2]);
    var statusObj = kasMap[nim] || { status: "Belum Lunas", tanggalBayar: "" };
    
    list.push({
      id: row[0],
      nama: row[1],
      nim: nim,
      divisi: row[3],
      penerimaanKe: row[4],
      jabatan: row[5],
      rekeningBNI: row[10] || "",
      status: statusObj.status,
      tanggalBayar: statusObj.tanggalBayar
    });
  }
  return list;
}

function updateRekeningAnggota(nim, rekeningBNI, operatorName) {
  if (!operatorName) throw new Error("Akses ditolak: Nama operator tidak valid");
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Anggota");
    if (!sheet) throw new Error("Database 'Anggota' tidak ditemukan");
    
    var data = sheet.getDataRange().getValues();
    var targetRowIndex = -1;
    var cleanNimInput = cleanNIM(nim);
    
    for (var i = 1; i < data.length; i++) {
      if (cleanNIM(data[i][2]) === cleanNimInput) {
        targetRowIndex = i + 1;
        break;
      }
    }
    
    if (targetRowIndex === -1) {
      throw new Error("Anggota dengan NIM " + nim + " tidak ditemukan.");
    }
    
    sheet.getRange(targetRowIndex, 11).setValue(String(rekeningBNI).trim());
    console.log("Operator " + operatorName + " mengupdate rekening BNI NIM " + nim + " menjadi " + rekeningBNI);
    return { success: true, message: "Rekening BNI berhasil diperbarui." };
  } finally {
    lock.releaseLock();
  }
}

function toggleKas(nim, semester, tahunAkademik, operatorName) {
  if (!operatorName) throw new Error("Akses ditolak: Nama operator tidak valid");
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetKas = ss.getSheetByName("Kas");
    if (!sheetKas) throw new Error("Database 'Kas' tidak ditemukan");
    
    var data = sheetKas.getDataRange().getValues();
    var targetRowIndex = -1;
    var currentStatus = "Belum Lunas";
    var cleanNimInput = cleanNIM(nim);
    
    for (var i = 1; i < data.length; i++) {
      var rowNim = cleanNIM(data[i][1]);
      var rowSem = String(data[i][2]);
      var rowYear = String(data[i][3]);
      
      if (rowNim === cleanNimInput && rowSem === semester && rowYear === tahunAkademik) {
        targetRowIndex = i + 1;
        currentStatus = data[i][4];
        break;
      }
    }
    
    var newStatus = "";
    var tanggalBayar = "";
    
    if (targetRowIndex !== -1) {
      if (currentStatus === "Lunas") {
        newStatus = "Belum Lunas";
        tanggalBayar = "";
      } else {
        newStatus = "Lunas";
        tanggalBayar = new Date();
      }
      sheetKas.getRange(targetRowIndex, 5).setValue(newStatus);
      sheetKas.getRange(targetRowIndex, 6).setValue(tanggalBayar);
    } else {
      // Find next ID
      var maxId = 0;
      for (var j = 1; j < data.length; j++) {
        var idStr = String(data[j][0]);
        var match = idStr.match(/KAS-(\d+)/);
        if (match) {
          var num = parseInt(match[1], 10);
          if (num > maxId) maxId = num;
        }
      }
      var newId = "KAS-" + String(maxId + 1).padStart(4, '0');
      newStatus = "Lunas";
      tanggalBayar = new Date();
      
      sheetKas.appendRow([
        newId,
        cleanNimInput,
        semester,
        tahunAkademik,
        newStatus,
        tanggalBayar
      ]);
    }
    
    var formattedDate = "";
    if (tanggalBayar instanceof Date) {
      var year = tanggalBayar.getFullYear();
      var month = String(tanggalBayar.getMonth() + 1).padStart(2, '0');
      var day = String(tanggalBayar.getDate()).padStart(2, '0');
      formattedDate = year + "-" + month + "-" + day;
    }
    
    console.log("Operator " + operatorName + " mengubah status KAS NIM " + nim + " (" + semester + " " + tahunAkademik + ") menjadi " + newStatus);
    return { success: true, status: newStatus, tanggalBayar: formattedDate };
  } finally {
    lock.releaseLock();
  }
}

function getDashboardData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var sheetAnggota = ss.getSheetByName("Anggota");
  var sheetKas = ss.getSheetByName("Kas");
  var sheetPartisipasi = ss.getSheetByName("Partisipasi_Kegiatan");
  var sheetKegiatan = ss.getSheetByName("Kegiatan");
  
  var anggotaData = sheetAnggota ? sheetAnggota.getDataRange().getValues() : [];
  var kasData = sheetKas ? sheetKas.getDataRange().getValues() : [];
  var partisipasiData = sheetPartisipasi ? sheetPartisipasi.getDataRange().getValues() : [];
  
  var divisiCounts = {};
  var totalAnggotaOnly = 0;
  var anggotaMap = {}; // NIM -> { id, nama, divisi, jabatan }
  
  for (var i = 1; i < anggotaData.length; i++) {
    var id = anggotaData[i][0];
    var nama = anggotaData[i][1];
    var nim = String(anggotaData[i][2]);
    var divisi = anggotaData[i][3];
    var jabatan = anggotaData[i][5];
    
    anggotaMap[nim] = { id: id, nama: nama, divisi: divisi, jabatan: jabatan };
    
    if (jabatan === "Anggota") {
      totalAnggotaOnly++;
      if (!divisiCounts[divisi]) {
        divisiCounts[divisi] = 0;
      }
      divisiCounts[divisi]++;
    }
  }
  
  var divisiStats = [];
  for (var div in divisiCounts) {
    divisiStats.push({ divisi: div, jumlah: divisiCounts[div] });
  }
  
  // Kas payment stats per Semester + Tahun Akademik
  var kasStats = {}; // "Semester Tahun" -> { lunas: X }
  for (var j = 1; j < kasData.length; j++) {
    var nim = String(kasData[j][1]);
    var semester = kasData[j][2];
    var tahun = kasData[j][3];
    var status = kasData[j][4];
    
    var key = semester + " " + tahun;
    if (!kasStats[key]) {
      kasStats[key] = { lunas: 0 };
    }
    
    if (status === "Lunas") {
      if (anggotaMap[nim] && anggotaMap[nim].jabatan === "Anggota") {
        kasStats[key].lunas++;
      }
    }
  }
  
  var kasStatsList = [];
  for (var key in kasStats) {
    var parts = key.split(" ");
    var sem = parts[0];
    var thn = parts[1];
    kasStatsList.push({
      semester: sem,
      tahunAkademik: thn,
      lunas: kasStats[key].lunas,
      total: totalAnggotaOnly,
      persentase: totalAnggotaOnly > 0 ? Math.round((kasStats[key].lunas / totalAnggotaOnly) * 100) : 0
    });
  }
  
  // Top 5 active members
  var partCounts = {}; // NIM -> count
  for (var k = 1; k < partisipasiData.length; k++) {
    var nim = String(partisipasiData[k][1]);
    if (anggotaMap[nim] && anggotaMap[nim].jabatan === "Anggota") {
      if (!partCounts[nim]) {
        partCounts[nim] = 0;
      }
      partCounts[nim]++;
    }
  }
  
  var leaderboard = [];
  for (var nim in partCounts) {
    if (anggotaMap[nim]) {
      leaderboard.push({
        nim: nim,
        nama: anggotaMap[nim].nama,
        divisi: anggotaMap[nim].divisi,
        jumlahPartisipasi: partCounts[nim]
      });
    }
  }
  
  leaderboard.sort(function(a, b) {
    return b.jumlahPartisipasi - a.jumlahPartisipasi;
  });
  
  var top5 = leaderboard.slice(0, 5);
  
  return {
    divisiStats: divisiStats,
    kasStats: kasStatsList,
    leaderboard: top5,
    totalAnggota: totalAnggotaOnly
  };
}
