// Who answers for the app's personal data (LGPD). Set in the deployment's environment; until then the
// pages say plainly that the identity or the contact is missing instead of inventing one.
// "Equipe Pactus" is only the project's public name: it is not a company or a legal person, and it is never shown as
// the controller. The controller's real identity must be set in NEXT_PUBLIC_CONTROLLER_NAME before a production build.
export const PUBLIC_NAME = "Equipe Pactus";
export const CONTROLLER_NAME = process.env.NEXT_PUBLIC_CONTROLLER_NAME?.trim() || "";
/** Public privacy channel (an institutional address). Never the private feedback recipient (FEEDBACK_TO_EMAIL). */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";
export const LEGAL_UPDATED = "11/11/2026";
