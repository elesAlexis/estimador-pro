import React, { createContext, useCallback, useContext, useMemo, useReducer, useState } from 'react';
import { isValidCalendarDate } from '../shared/calendarDate';
import { normalizeProject } from '../application/projectValidation';
import { calculateProjectTotals } from '../domain/metrics';
import { calendarYearRange } from '../domain/calendarRange';
import { exportDisabledReason } from '../application/exportReadiness';
import { calculateSprintDates, isValidDuration } from '../domain/schedule';
import { bindProjectActions, projectActions } from '../application/projectActions';
import { projectReducer } from '../application/projectReducer';
import { readProject } from '../application/projectPersistence';
import { useProjectPersistence } from './useProjectPersistence';
import { useProjectCalendar } from './useProjectCalendar';
import { decorateRemoteFields } from '../application/gitlab/remoteFields';

const ProjectStateContext = createContext(null);
const ProjectActionsContext = createContext(null);
const HolidayContext = createContext(null);
const PersistenceContext = createContext(null);

/** Composition adapter: sus efectos viven en hooks separados. */
export function ProjectProvider({ repository, holidayProvider, children }) {
  const [initial] = useState(() => readProject(repository));
  const [project, dispatch] = useReducer(projectReducer, initial.project);
  const { projectInfo, sprints, announcement = '' } = project;
  const onRecovered = useCallback(value => dispatch(projectActions.replaceProject(value)), []);
  const persistence = useProjectPersistence(repository, project, initial.recovery, onRecovered);
  const setProjectInfo = useCallback(info => dispatch(projectActions.setProjectInfo(info)), []);
  const { prepareImport } = persistence;
  const replaceProject = useCallback(value => {
    const normalized = normalizeProject(value);
    prepareImport();
    dispatch(projectActions.replaceProject(normalized));
  }, [prepareImport]);

  // Campos derivados del snapshot remoto. No se persisten: se recalculan aquí.
  const decoratedSprints = useMemo(() => decorateRemoteFields(sprints), [sprints]);

  const calendarValidation = useMemo(() => ({
    hasValidStartDate: isValidCalendarDate(projectInfo.startDate),
    invalidTaskCount: sprints.reduce((count, sprint) => count + sprint.tasks.filter(task => task.scheduleMode !== 'imported' && !isValidDuration(task.duration)).length, 0),
  }), [projectInfo.startDate, sprints]);
  const range = useMemo(() => calendarYearRange(projectInfo.startDate, decoratedSprints),
    [projectInfo.startDate, decoratedSprints]);
  const holidays = useProjectCalendar(holidayProvider, range?.start ?? null, range?.end ?? null);
  const calculatedSprints = useMemo(() => {
    const result = calculateSprintDates(decoratedSprints, holidays.calendarReady ? projectInfo.startDate : '', holidays.holidaySet);
    return result.map((sprint, si) => ({
      ...sprint,
      tasks: sprint.tasks.map((task, ti) => ({ ...task, calculatedWbs: `${si + 1}.${ti + 1}` })),
    }));
  }, [decoratedSprints, projectInfo.startDate, holidays.calendarReady, holidays.holidaySet]);
  const totals = useMemo(() => calculateProjectTotals(calculatedSprints), [calculatedSprints]);
  const exportBlocked = exportDisabledReason({ ...calendarValidation, calendarReady: holidays.calendarReady,
    holidaySource: holidays.holidaySource, totalTasks: totals.totalTasks });
  const actions = useMemo(() => ({ ...bindProjectActions(dispatch), setProjectInfo, replaceProject }), [setProjectInfo, replaceProject]);
  const state = useMemo(() => ({ projectInfo, sprints, calculatedSprints, totals, calendarValidation,
    exportDisabledReason: exportBlocked, announcement }),
    [projectInfo, sprints, calculatedSprints, totals, calendarValidation, exportBlocked, announcement]);
  return (
    <ProjectActionsContext.Provider value={actions}>
      <ProjectStateContext.Provider value={state}>
        <HolidayContext.Provider value={holidays}>
          <PersistenceContext.Provider value={persistence}>{children}</PersistenceContext.Provider>
        </HolidayContext.Provider>
      </ProjectStateContext.Provider>
    </ProjectActionsContext.Provider>
  );
}
function useRequiredContext(context, hookName) {
  const value = useContext(context);
  if (!value) throw new Error(`${hookName} must be used within a ProjectProvider`);
  return value;
}
export const useProjectState = () => useRequiredContext(ProjectStateContext, 'useProjectState');
export const useProjectActions = () => useRequiredContext(ProjectActionsContext, 'useProjectActions');
export const useHolidays = () => useRequiredContext(HolidayContext, 'useHolidays');
export const usePersistence = () => useRequiredContext(PersistenceContext, 'usePersistence');
