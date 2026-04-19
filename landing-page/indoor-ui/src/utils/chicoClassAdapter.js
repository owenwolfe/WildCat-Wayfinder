import chicoClasses from "../data/chico_classes_p.json";

export function formatTime(value) {
  if (!value) return "";
  const parts = String(value).split(".");
  const hh = Number(parts[0]);
  const mm = parts[1] || "00";
  if (Number.isNaN(hh)) return "";

  const suffix = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 || 12;
  return `${hour12}:${mm} ${suffix}`;
}

export function buildCourseLabel(record) {
  const course = `${record.subject} ${record.catalog_nbr}`.trim();
  const title = record.descr || "";
  const section = record.class_section || "";
  const meeting = record.meetings?.[0];

  const place = meeting?.facility_descr || "Location TBA";
  const days = meeting?.days || "TBA";
  const start = formatTime(meeting?.start_time);
  const end = formatTime(meeting?.end_time);

  return {
    id: String(record.class_nbr),
    course,
    title,
    section,
    class_nbr: record.class_nbr,
    facility_id: meeting?.facility_id || "",
    facility_descr: meeting?.facility_descr || "",
    room: meeting?.room || "",
    building: meeting?.facility_descr || "",
    building_code: meeting?.bldg_cd || "",
    days,
    start_time: meeting?.start_time || "",
    end_time: meeting?.end_time || "",
    displayLabel: `${course} - ${title}`,
    displaySubtext: `Section ${section} · ${days} ${start}${end ? `-${end}` : ""} · ${place}`,
    raw: record,
  };
}

export function getSearchableClassRecords() {
  return chicoClasses
    .filter((record) => Array.isArray(record.meetings) && record.meetings.length > 0)
    .map(buildCourseLabel);
}