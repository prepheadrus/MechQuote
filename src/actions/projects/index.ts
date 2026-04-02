/**
 * Projects Server Actions
 *
 * Bu dosya, projects klasöründeki tüm action'ları export eder
 */

// Export from main projects file
export {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  deleteProjectInternal,
  createProjectFromProposalInternal,
  getProjectsByCustomer,
  getAllProjects,
  getProjectsForSelect,
  deleteProjectByName,
  // Additional exports
  getProjectTeam,
  updateProjectStatus,
  addOrUpdateProject,
  addProjectStatusHistory
} from './projects';
