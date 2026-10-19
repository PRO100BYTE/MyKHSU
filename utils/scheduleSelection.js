export const getScheduleGroups = (result) => {
  const groups = Array.isArray(result?.data) ? result.data : result?.data?.groups;
  return Array.isArray(groups) ? groups.filter(group => typeof group === 'string' && group.length > 0) : [];
};

export const isConfirmedGroupList = result =>
  (result?.source === 'api' || result?.source === 'proxy') &&
  (Array.isArray(result?.data) || Array.isArray(result?.data?.groups));

// A cached absence is not evidence that a group has moved to another course.
export const resolveScheduleSelection = async ({ course, group, result, courses, getGroups, isCurrent }) => {
  const groups = getScheduleGroups(result);
  if (!group || groups.includes(group) || !isConfirmedGroupList(result)) {
    return { course, group: group || groups[0] || null, groups, result };
  }
  for (const candidate of courses.filter(item => course > 0 && item.id > course)) {
    if (!isCurrent()) return null;
    let next;
    try {
      next = await getGroups(candidate.id);
    } catch {
      continue;
    }
    if (!isCurrent()) return null;
    const nextGroups = getScheduleGroups(next);
    if (isConfirmedGroupList(next) && nextGroups.includes(group)) {
      return { course: candidate.id, group, groups: nextGroups, result: next };
    }
  }
  return { course, group: null, groups, result };
};
