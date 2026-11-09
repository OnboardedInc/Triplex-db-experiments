import { Effect } from 'effect';
import { ReadError, BasisNotAvailable, type CommitStamp, type RecordCut } from '@triplex-build/triplex';
const stamp: CommitStamp = {instant:1,decided:true}; const cut: RecordCut = {position:1,recordedAt:1};
const read: Effect.Effect<never, ReadError> = Effect.fail(new ReadError({message:'normal'}));
const handled = read.pipe(Effect.catchTag('ReadError',error=>Effect.succeed(error.message)),Effect.catchTag('BasisNotAvailable',error=>Effect.succeed(error.axis)));
const basis: ReadError = new BasisNotAvailable({axis:'recordedAt',required:2,observed:1,waitedMs:0,surface:'consumer',message:'future'});
void [stamp,cut,handled,basis];
