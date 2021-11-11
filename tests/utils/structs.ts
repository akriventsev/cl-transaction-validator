// @ts-ignore
import { u8, struct } from 'buffer-layout';
import * as anchor from "@project-serum/anchor";
import {
    Layout,
    publicKey,
    vec,
    rustEnum
} from '@project-serum/borsh';

export type GovernanceOperation =
    | { AddStakeholders: any }
    | { RemoveStakeholders: any }
    | { AddOracles: any }
    | { RemoveOracles: any };
const GovernanceOperationLayout: Layout<GovernanceOperation> = rustEnum([
    struct([], 'AddStakeholders'),
    struct([], 'RemoveStakeholders'),
    struct([], 'AddOracles'),
    struct([], 'RemoveOracles')
]);

interface ExecuteGovernanceArgs {
    /** Token mint address for the pool token. */
    operation: GovernanceOperation;
    keys: anchor.web3.PublicKey[];
}

export const ExecuteGovernanceKeysLayout: Layout<anchor.web3.PublicKey[]> = vec(publicKey());
export function encodeGovernanceArgs(args: ExecuteGovernanceArgs): Buffer {
    let op = Buffer.alloc(4);
    let op_len = GovernanceOperationLayout.encode(args.operation, op);
    let keys = Buffer.alloc(1000);
    let keys_len = ExecuteGovernanceKeysLayout.encode(args.keys, keys);

    return Buffer.concat([op.slice(0, op_len), keys.slice(0, keys_len)]);
}