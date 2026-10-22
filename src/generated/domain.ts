/* Generated from specs/10-domain/project.schema.json by scripts/gen.ts. Do not edit. */

/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "slug".
 */
export type Slug = string;
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "date".
 */
export type IsoDate = string;
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "timestamp".
 */
export type Timestamp = string;
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "secureUrl".
 */
export type SecureUrl = string;
/**
 * Relative path of an asset bundled with the portal, inside content/assets/ (no ".." segments); never a remote address (NFR-05).
 *
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "assetPath".
 */
export type AssetPath = string;
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "yearMonth".
 */
export type YearMonth = string;

/**
 * Shapes of authored content (ENT-CatalogEntry, ENT-Tool, ENT-Category, ENT-Profile, ENT-NowNote, ENT-Resume, ENT-Policy) and on-device personal data (ENT-PersonalData). Meaning and invariants: model.md.
 */
export interface TaroKitDataModel {
  [k: string]: unknown;
}
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "link".
 */
export interface Link {
  label: string;
  url: string;
  kind?: "email" | "social" | "website" | "code" | "other";
}
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "entryBase".
 */
export interface EntryBase {
  id: string;
  kind: "tool";
  name: string;
  summary: string;
  icon?: AssetPath;
  /**
   * @maxItems 12
   */
  tags?: string[];
  added: IsoDate;
  updated?: IsoDate;
  hidden?: boolean;
}
export interface Tool {
  kind?: "tool";
  category: string;
  url: SecureUrl;
  origin: "own" | "external";
  openMode?: "embedded" | "linked";
  permissions?: (
    "clipboard-read" | "clipboard-write" | "downloads" | "file-pick" | "popups" | "fullscreen" | "camera" | "microphone"
  )[];
  offline?: boolean;
  sourceUrl?: SecureUrl;
}
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "category".
 */
export interface Category {
  id: string;
  name: string;
  order: number;
  intro: string;
  icon: AssetPath;
  tint: "violet" | "mango" | "sky" | "mint";
}
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "profile".
 */
export interface Profile {
  name: string;
  headline: string;
  avatar?: AssetPath;
  bio: string;
  location?: string;
  /**
   * @maxItems 10
   */
  links: Link[];
  nickname?: string;
}
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "nowNote".
 */
export interface NowNote {
  body: string;
  updated: IsoDate;
}
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "personalData".
 */
export interface PersonalData {
  schemaVersion: number;
  /**
   * @maxItems 24
   */
  favorites: {
    toolId: Slug;
    pinnedAt: Timestamp;
  }[];
  /**
   * @maxItems 20
   */
  recents: {
    toolId: Slug;
    openedAt: Timestamp;
  }[];
  preferences: {
    theme?: "system" | "light" | "dark";
  };
  /**
   * RULE-13
   *
   * @maxItems 60
   */
  daysUsed: IsoDate[];
}
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "backupFile".
 */
export interface BackupFile {
  format: "tarokit-backup";
  exportedAt: Timestamp;
  data: PersonalData;
}
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "resume".
 */
export interface Resume {
  /**
   * @maxItems 20
   */
  experience?: {
    role: string;
    organization: string;
    start: YearMonth;
    end?: YearMonth;
    summary: string;
    /**
     * @maxItems 8
     */
    highlights?: string[];
  }[];
  /**
   * @maxItems 10
   */
  education?: {
    program: string;
    institution: string;
    level?: string;
    start: YearMonth;
    end?: YearMonth;
    notes?: string;
  }[];
  /**
   * @maxItems 40
   */
  skills?: {
    name: string;
    group?: string;
    level?: number;
  }[];
  /**
   * @maxItems 10
   */
  languages?: {
    name: string;
    level: string;
  }[];
  /**
   * @maxItems 20
   */
  certificates?: {
    name: string;
    issuer: string;
    year: number;
  }[];
  /**
   * @maxItems 20
   */
  awards?: {
    title: string;
    issuer: string;
    year: number;
  }[];
}
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "policy".
 */
export interface Policy {
  title: string;
  updated: IsoDate;
  /**
   * @minItems 1
   * @maxItems 20
   */
  sections: [
    {
      heading: string;
      body: string;
    },
    ...{
      heading: string;
      body: string;
    }[]
  ];
}
