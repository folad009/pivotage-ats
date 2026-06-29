import { expect, test } from "@playwright/test";

import { dragCandidateToColumn } from "./helpers/kanban";
import { loginAs, USERS } from "./helpers/auth";
import { gotoApp } from "./helpers/navigation";

test.describe("golden path recruitment flow", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(300_000);

  const runId = Date.now();
  const clientName = `E2E Client ${runId}`;
  const jobTitle = `E2E Role ${runId}`;
  const firstName = "E2E";
  const lastName = `Candidate${runId}`;
  const email = `e2e.candidate.${runId}@example.test`;
  const candidateName = `${firstName} ${lastName}`;

  let jobId = "";
  let applicationDetailUrl = "";

  test("login → client → job → candidate → application → pipeline → interview → scorecard → hire → archive", async ({
    page,
  }) => {
    await loginAs(page, USERS.recruiter.email, USERS.recruiter.password);

    await gotoApp(page, "/clients");
    await expect(page.getByRole("heading", { name: "Clients", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "New client" }).click();
    const clientDialog = page.getByRole("dialog", { name: "New client" });
    await expect(clientDialog).toBeVisible({ timeout: 30_000 });
    await clientDialog.getByLabel("Name").fill(clientName);
    await clientDialog.getByLabel("Contact email").fill(`contact.${runId}@example.test`);
    await clientDialog.getByRole("button", { name: "Create client" }).click();
    await expect(page.getByText("Client created")).toBeVisible();
    await expect(page.getByRole("link", { name: clientName })).toBeVisible();

    await gotoApp(page, "/jobs");
    await page.getByRole("button", { name: "New job" }).click();
    const jobDialog = page.getByRole("dialog", { name: "New job" });
    await jobDialog.getByLabel("Title").fill(jobTitle);
    await jobDialog.getByRole("combobox", { name: "Client" }).click();
    await page.getByRole("option", { name: clientName }).click();
    await jobDialog.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Open" }).click();
    await jobDialog.getByRole("button", { name: "Create job" }).click();
    await expect(page.getByText("Job created")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByLabel("Search jobs").fill(jobTitle);
    const jobLink = page.getByRole("link", { name: jobTitle });
    await expect(jobLink).toBeVisible();
    const jobHref = await jobLink.getAttribute("href");
    expect(jobHref).toMatch(/^\/jobs\/.+/);
    jobId = jobHref!.replace(/^\/jobs\//, "").split("?")[0] ?? "";
    expect(jobId.length).toBeGreaterThan(0);
    await gotoApp(page, jobHref!);
    await expect(page).toHaveURL(/\/jobs\/.+/);

    await gotoApp(page, "/candidates");
    await expect(page.getByRole("heading", { name: "Candidates", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "New candidate" }).click();
    const candidateDialog = page.getByRole("dialog", { name: "New candidate" });
    await expect(candidateDialog).toBeVisible({ timeout: 30_000 });
    await candidateDialog.getByLabel("First name").fill(firstName);
    await candidateDialog.getByLabel("Last name").fill(lastName);
    await candidateDialog.getByLabel("Email").fill(email);
    await candidateDialog.getByRole("button", { name: "Create candidate" }).click();
    await expect(page.getByText("Candidate created")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByLabel("Search candidates").fill(email);
    await expect(page.getByRole("link", { name: candidateName })).toBeVisible();

    await gotoApp(page, `/applications/board/${jobId}`);
    await expect(page.getByRole("button", { name: "Add application" })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole("button", { name: "Add application" }).click();
    const applicationDialog = page.getByRole("dialog", { name: "Add application" });
    await expect(applicationDialog).toBeVisible();
    await applicationDialog.getByLabel("Candidate").click();
    await page.getByRole("option", { name: new RegExp(email, "i") }).click();
    await applicationDialog.getByRole("button", { name: "Create application" }).click();
    await expect(page.getByText("Application created")).toBeVisible();
    await expect(page.getByRole("link", { name: candidateName })).toBeVisible();

    await dragCandidateToColumn(page, candidateName, "Screening");
    await dragCandidateToColumn(page, candidateName, "Offer");

    const applicationLink = page.getByRole("link", { name: candidateName });
    const applicationHref = await applicationLink.getAttribute("href");
    expect(applicationHref).toMatch(/^\/applications\/detail\/.+/);
    await gotoApp(page, applicationHref!);
    await expect(page).toHaveURL(/\/applications\/detail\/.+/);
    applicationDetailUrl = page.url();

    await page.getByRole("button", { name: "Schedule" }).click();
    const scheduleDialog = page.getByRole("dialog", { name: "Schedule interview" });
    await expect(scheduleDialog).toBeVisible();
    await scheduleDialog.getByRole("checkbox", { name: /Riley Recruiter/i }).check();
    await scheduleDialog.getByRole("button", { name: "Schedule interview" }).click();
    await expect(page.getByText(/Interview scheduled/i)).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "Submit scorecard" }).click();
    await expect(page.getByText("Scorecard saved")).toBeVisible({ timeout: 15_000 });

    await gotoApp(page, `/applications/board/${jobId}`);
    await dragCandidateToColumn(page, candidateName, "Hired");

    await gotoApp(page, applicationDetailUrl);
    await page.getByRole("button", { name: "Archive application" }).click();
    await page.getByRole("button", { name: "Archive application" }).last().click();
    await expect(page.getByText("Application archived")).toBeVisible();
    await expect(
      page.locator("header").getByText("Archived", { exact: true }),
    ).toBeVisible();
  });
});
