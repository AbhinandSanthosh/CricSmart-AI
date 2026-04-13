import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let adminApp: App;
let adminAuth: Auth;

try {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  adminAuth = getAuth(adminApp);
} catch (e) {
  console.warn("[Firebase Admin] Init failed — credentials not configured yet:", (e as Error).message);
  adminApp = {} as App;
  adminAuth = {} as Auth;
}

export { adminAuth };
export default adminApp;
