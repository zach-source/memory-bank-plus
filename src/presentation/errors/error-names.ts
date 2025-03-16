/**
 * Enum defining all error names for consistency across the application.
 * Used to ensure error classes have properly named constructors and types.
 */
export enum ErrorName {
  INVALID_PROJECT_NAME = "InvalidProjectNameError",
  INVALID_FILE_NAME = "InvalidFileNameError",
  PROJECT_NOT_FOUND = "ProjectNotFoundError",
  FILE_NOT_FOUND = "FileNotFoundError",
  WRITE_ERROR = "WriteError",
  READ_ERROR = "ReadError",
  UPDATE_ERROR = "UpdateError",
  LIST_PROJECTS_ERROR = "ListProjectsError",
  LIST_PROJECT_FILES_ERROR = "ListProjectFilesError",
  UNEXPECTED_ERROR = "UnexpectedError",
}
