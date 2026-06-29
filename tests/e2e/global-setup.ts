import { loadProjectEnv } from "../helpers/load-env";
import { prepareTestDatabase } from "../helpers/prepare-test-database";

export default function globalSetup(): void {
  loadProjectEnv();
  prepareTestDatabase();
}
