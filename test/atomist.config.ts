import {
    Configuration,
} from "@atomist/automation-client";
import {
    goals,
    onAnyPush,
    SoftwareDeliveryMachine,
    SoftwareDeliveryMachineConfiguration,
} from "@atomist/sdm";
import {
    configureSdm,
    createSoftwareDeliveryMachine,
} from "@atomist/sdm-core";
import {AnsibleEngine} from "../lib/goal/ansible";

export function machineMaker(config: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine {

    const sdm = createSoftwareDeliveryMachine(
        {
            name: `${configuration.name}-test`,
            configuration: config,
        },
    );

    const ansible = new AnsibleEngine()
        .with({
            cmdPrefix: "/Users/matt/Library/Python/2.7/bin",
            args: ["-m", "ping", "localhost"],
        });

    const ansiblePlaybook = new AnsibleEngine()
        .with({
            cmdPrefix: "/Users/matt/Library/Python/2.7/bin",
            playbook: "test.yaml",
        });

    sdm.withPushRules(
        onAnyPush()
            .setGoals(
                goals("ansible-examples")
                    .plan(ansible)
                    .plan(ansiblePlaybook).after(ansible),
            ),
    );

    return sdm;
}

export const configuration: Configuration = {
    postProcessors: [
        configureSdm(machineMaker),
    ],
};
