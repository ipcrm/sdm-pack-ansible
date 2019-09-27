import {GitProject, Success} from "@atomist/automation-client";
import {
    DefaultGoalNameGenerator,
    doWithProject,
    ExecuteGoal,
    FulfillableGoalDetails,
    FulfillableGoalWithRegistrations,
    getGoalDefinitionFrom,
    Goal, GoalDefinition,
    Implementation, IndependentOfEnvironment,
    spawnLog,
    StringCapturingProgressLog,
    SuccessIsReturn0ErrorFinder,
    WriteToAllProgressLog,
} from "@atomist/sdm";
import {toArray} from "@atomist/sdm-core/lib/util/misc/array";
import {AnsibleProgressReporter} from "./progressReporter";

export type playbookLocator = (p: GitProject) => Promise<string> | Promise<string[]>;

const AnsibleEngineGoalDefinition: GoalDefinition = {
    displayName: "Running: Ansible",
    uniqueName: "ansible-execution",
    environment: IndependentOfEnvironment,
    workingDescription: "Working: Ansible Execution",
    completedDescription: "Completed: Ansible Execution",
    failedDescription: "Failed: Ansible Execution",
    waitingForApprovalDescription: "Waiting for approval: Ansible Execution",
    waitingForPreApprovalDescription: "Waiting to start: Ansible Execution",
    stoppedDescription: "Stopped: Ansible Execution",
    canceledDescription: "Cancelled: Ansible Execution",
    retryFeasible: true,
};

interface AnsibleConfiguration {
    /**
     * Supply the path to Ansible commands.  Optional.
     */
    cmdPrefix?: string;

    /**
     * Playbook name.  If playbook is not set, the command used with be "ansible" instead of "ansible-playbook"
     */
    playbook?: string | playbookLocator;

    /**
     * Options
     */
    args?: Array<string | {arg: string, value: string}>;

    /**
     * Extra env args to pass in
     */
    envArgs?: Record<string, string>;
}

export class AnsibleEngine extends FulfillableGoalWithRegistrations<AnsibleConfiguration> {
    // tslint:disable-next-line
    constructor(protected details: FulfillableGoalDetails | string = DefaultGoalNameGenerator.generateName("ansible-engine"),
                ...dependsOn: Goal[]) {

        super({
            ...AnsibleEngineGoalDefinition,
            ...getGoalDefinitionFrom(details, DefaultGoalNameGenerator.generateName("ansible-engine")),
        }, ...dependsOn);
    }

    public with(
        registration: AnsibleConfiguration,
    ): this {
        // tslint:disable-next-line:no-object-literal-type-assertion
        this.addFulfillment({
            name: DefaultGoalNameGenerator.generateName("ansible-engine"),
            goalExecutor: ansibleEngineExecution(registration),
            progressReporter: AnsibleProgressReporter,
        } as Implementation);
        return this;
    }
}

export function ansibleEngineExecution(registration: AnsibleConfiguration): ExecuteGoal {
    return doWithProject(async gi => {
        gi.progressLog.write(`Starting Ansible Engine execution`);
        const pl = new WriteToAllProgressLog("combinedLog", gi.progressLog, new StringCapturingProgressLog());

        // Figure out args
        const positionalArgs: string[] = [];
        const namedArgs: string[] = [];
        if (registration.args) {
            registration.args.map(a => {
                if (typeof a === "string") {
                    positionalArgs.push(a);
                } else if (typeof a === "object") {
                    const prefix = a.arg.length > 1 ? `--` : `-`;
                    namedArgs.push(`${prefix}${a.arg}=${a.value}`);
                }
            });
        }
        const newArgs = [...namedArgs, ...positionalArgs];

        // Determine command to call
        let command: string;
        if (registration.playbook) {
            command = registration.cmdPrefix ? `${registration.cmdPrefix}/ansible-playbook` : `ansible-playbook`;
        } else {
            command = registration.cmdPrefix ? `${registration.cmdPrefix}/ansible` : `ansible`;
        }

        // Determine where playbook is
        if (registration.playbook) {
            if (typeof registration.playbook === "string") {
                newArgs.push(registration.playbook);
            } else if (typeof registration.playbook === "function") {
                newArgs.push(...toArray(await registration.playbook(gi.project)));
            }
        }

        // Run Ansible Engine
        const result = await spawnLog(
            command,
            newArgs,
            {
                cwd: gi.project.baseDir,
                env: {
                    ...process.env,
                    ...registration.envArgs,
                    ANSIBLE_NOCOWS: "1",
                },
                log: pl,
                errorFinder: SuccessIsReturn0ErrorFinder,
            },
        );

        if (result && result.code !== 0) {
            return result;
        }

        return Success;
    });
}
