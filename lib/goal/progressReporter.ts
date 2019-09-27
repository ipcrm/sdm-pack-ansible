import {ProgressTest, ReportProgress, testProgressReporter} from "@atomist/sdm";

/**
 * Default progress tests for Ansible Engine
 * @type {{test: RegExp; phase: string}[]}
 */
export const AnsibleProgressTests: ProgressTest[] = [{
    test: /Invoking goal hook: pre/i,
    phase: "pre-hook",
}, {
    test: /PLAY\s[\[]?([a-zA-Z,\s]+)[]]?/i,
    phase: "$1",
}, {
    test: /TASK\s\[([a-zA-Z,\s]+)]/i,
    phase: "$1",
}, {
    test: /Invoking goal hook: post/i,
    phase: "post-hook",
}];

/**
 * Default ReportProgress for our Ansible Engine Executions
 */
export const AnsibleProgressReporter: ReportProgress = testProgressReporter(...AnsibleProgressTests);
