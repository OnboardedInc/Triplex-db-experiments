// [DX-ACT2] Why: deep writes consume their predecessor's actual native triple IDs. Accept the burst immediately and build each dependent command after its predecessor. Publish uses the separate native admission queue. Rejected: submitting stale prebuilt replacements from the same account.
export class OrderedSaves {
  private readonly byAccount = new Map<string, Promise<void>>();
  submit<T>(account: string, work: () => Promise<T>): Promise<T> {
    const result = (this.byAccount.get(account) ?? Promise.resolve()).then(work);
    const tail = result.then(
      () => {},
      () => {},
    );
    this.byAccount.set(account, tail);
    void tail.then(() => {
      if (this.byAccount.get(account) === tail) this.byAccount.delete(account);
    });
    return result;
  }
  drain() {
    return Promise.all(this.byAccount.values());
  }
}
