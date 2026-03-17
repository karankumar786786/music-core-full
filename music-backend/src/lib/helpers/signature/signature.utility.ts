import * as crypto from 'crypto';

export class SignatureUtility {
    private static readonly ALGORITHM = 'sha256';
    private static readonly SECRET = process.env.SIGNATURE_SECRET || 'fallback-secret-for-dev-only-change-in-prod';

    /**
     * Generates a secure Signed ID in the format `uuid.signature`.
     * This makes the ID self-verifying.
     */
    static generateSignedId(): string {
        const uuid = crypto.randomUUID();
        const signature = crypto
            .createHmac(this.ALGORITHM, this.SECRET)
            .update(uuid)
            .digest('hex');
        return `${uuid}.${signature}`;
    }

    /**
     * Verifies if a provided Signed ID is valid.
     * Expects format: `uuid.signature`
     */
    static verifyId(signedId: string): boolean {
        if (!signedId || typeof signedId !== 'string') return false;

        const parts = signedId.split('.');
        if (parts.length !== 2) return false;

        const uuid = parts[0];
        const providedSignature = parts[1];

        if (!uuid || !providedSignature) return false;

        const expectedSignature = crypto
            .createHmac(this.ALGORITHM, this.SECRET)
            .update(uuid)
            .digest('hex');

        try {
            return crypto.timingSafeEqual(
                Buffer.from(providedSignature, 'hex'),
                Buffer.from(expectedSignature, 'hex')
            );
        } catch (e) {
            return false;
        }
    }
}
