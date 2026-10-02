export const DEFAULT_ROLE_TEMPLATES = {
  entry: {
    1: { msg: 'PERHATIAN: BERSEDIA', msg2: 'SMARTLANE AKAN DIBUKA' },
    2: { msg: 'SMARTLANE BERMULA', msg2: 'GUNAKAN LORONG KECEMASAN' },
    3: { msg: 'SMARTLANE AKAN DITUTUP', msg2: 'BERSEDIA MASUK LORONG UTAMA' },
    4: { msg: 'PEMERIKSAAN LORONG', msg2: 'PATUHI ARAHAN PETUGAS' },
    5: { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' },
    0: { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' },
  },
  exit: {
    1: { msg: 'PERHATIAN: BERSEDIA', msg2: 'SMARTLANE AKAN DIBUKA' },
    2: { msg: 'SMARTLANE TAMAT', msg2: 'MASUK KEMBALI KE LORONG UTAMA' },
    3: { msg: 'SMARTLANE AKAN DITUTUP', msg2: 'KOSONGKAN LORONG KECEMASAN' },
    4: { msg: 'PEMERIKSAAN LORONG', msg2: 'PATUHI ARAHAN PETUGAS' },
    5: { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' },
    0: { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' },
  },
  mini: {
    1: { msg: 'PATUHI ARAHAN', msg2: 'PERHATIKAN ISYARAT LCS' },
    2: { msg: 'JALUR KECEMASAN', msg2: 'DIBUKA SEMENTARA' },
    3: { msg: 'BERSEDIA KELUAR', msg2: 'SEGERA MASUK LORONG UTAMA' },
    4: { msg: 'PEMERIKSAAN KAWASAN', msg2: 'PANDU DENGAN CERMAT' },
    5: { msg: 'LORONG KECEMASAN', msg2: 'DITUTUP SEMENTARA' },
    0: { msg: 'LORONG KECEMASAN', msg2: 'DITUTUP SEMENTARA' },
  },
};

export function getDynamicVmsMessage(sign, phase = 0) {
  if (!sign) return { msg: 'SMARTLANE DITUTUP', msg2: 'GUNA LORONG UTAMA SAHAJA' };
  const phaseNumber = Number(phase) || 0;
  if (phaseNumber === -1) return { msg: 'INTERVENTION ACTIVE', msg2: 'VMS POLICY AWAITING APPROVAL' };
  if (sign.phaseTemplates?.[phaseNumber]) return sign.phaseTemplates[phaseNumber];
  let role = 'entry';
  if (sign.position === 'Exit' || sign.position === 'End') role = 'exit';
  else if (sign.type?.toLowerCase().includes('mini') || sign.type?.toLowerCase().includes('unipole') || sign.position === 'Intermediate' || sign.position === 'Mid' || sign.id?.startsWith('mvms')) role = 'mini';
  const roleMap = DEFAULT_ROLE_TEMPLATES[role] || DEFAULT_ROLE_TEMPLATES.entry;
  return roleMap[phaseNumber] || roleMap[0] || roleMap[5];
}

export function operationVmsMessages(location, operationType, templates = {}, devices = []) {
  const phase = operationType === 'Deactivate' ? 3 : 1;
  const configuredDevices = devices.filter(device => device.locationId === location?.id && ['VMS', 'Mini VMS'].includes(device.type));
  const signs = configuredDevices.length ? configuredDevices : [...(location?.vms || []), ...(location?.miniVms || [])];
  return signs.map(item => {
    const sign = item.sign || item;
    const saved = item.id ? templates[`${location.id}|${item.id}|${phase}`] : null;
    const message = saved ? { msg: saved.line1, msg2: saved.line2 } : getDynamicVmsMessage(sign, phase);
    const identity = item.km || sign.km || item.id || sign.id || sign.type || 'VMS';
    return `${identity}: ${[message.msg, message.msg2].filter(Boolean).join(' / ')}`;
  });
}
