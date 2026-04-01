import { ImageKit } from "@imagekit/nodejs";

export const imageKitClient = new ImageKit({
    privateKey: "private_jXKH0irhPK6sYkYY9aS7jU7Qmao=",
    // urlEndpoint is not needed in v7 for uploads; it's only used for URL building
});
