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
  /**
   * A name (INV-09): one text for both languages, or a version per language.
   */
  label:
    | string
    | {
        "en-US": string;
        "vi-VN": string;
      };
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
  /**
   * Localized text (INV-09): both versions required; limits apply to each.
   */
  summary: {
    "en-US": string;
    "vi-VN": string;
  };
  icon?: AssetPath;
  /**
   * @maxItems 20
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
  /**
   * Localized text (INV-09): both versions required; limits apply to each.
   */
  name: {
    "en-US": string;
    "vi-VN": string;
  };
  order: number;
  /**
   * Localized text (INV-09): both versions required; limits apply to each.
   */
  intro: {
    "en-US": string;
    "vi-VN": string;
  };
  icon: AssetPath;
  tint: "violet" | "mango" | "sky" | "mint";
}
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "profile".
 */
export interface Profile {
  name: string;
  /**
   * Localized text (INV-09): both versions required; limits apply to each.
   */
  headline: {
    "en-US": string;
    "vi-VN": string;
  };
  avatar?: AssetPath;
  /**
   * Localized text (INV-09): both versions required; limits apply to each.
   */
  bio: {
    "en-US": string;
    "vi-VN": string;
  };
  /**
   * A name (INV-09): one text for both languages, or a version per language.
   */
  location?:
    | string
    | {
        "en-US": string;
        "vi-VN": string;
      };
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
  /**
   * Localized text (INV-09): both versions required; limits apply to each.
   */
  body: {
    "en-US": string;
    "vi-VN": string;
  };
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
    /**
     * F-019; absent means the language follows the device (RULE-16).
     */
    language?: "en-US" | "vi-VN";
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
    /**
     * Localized text (INV-09): both versions required; limits apply to each.
     */
    role: {
      "en-US": string;
      "vi-VN": string;
    };
    /**
     * A name (INV-09): one text for both languages, or a version per language.
     */
    organization:
      | string
      | {
          "en-US": string;
          "vi-VN": string;
        };
    start: YearMonth;
    end?: YearMonth;
    /**
     * Localized text (INV-09): both versions required; limits apply to each.
     */
    summary: {
      "en-US": string;
      "vi-VN": string;
    };
    /**
     * @maxItems 8
     *
     * Items: Localized text (INV-09): both versions required; limits apply to each.
     */
    highlights?: {
      "en-US": string;
      "vi-VN": string;
    }[];
  }[];
  /**
   * @maxItems 10
   */
  education?: {
    /**
     * Localized text (INV-09): both versions required; limits apply to each.
     */
    program: {
      "en-US": string;
      "vi-VN": string;
    };
    /**
     * A name (INV-09): one text for both languages, or a version per language.
     */
    institution:
      | string
      | {
          "en-US": string;
          "vi-VN": string;
        };
    /**
     * Localized text (INV-09): both versions required; limits apply to each.
     */
    level?: {
      "en-US": string;
      "vi-VN": string;
    };
    start: YearMonth;
    end?: YearMonth;
    /**
     * Localized text (INV-09): both versions required; limits apply to each.
     */
    notes?: {
      "en-US": string;
      "vi-VN": string;
    };
  }[];
  /**
   * @maxItems 40
   */
  skills?: {
    /**
     * A name (INV-09): one text for both languages, or a version per language.
     */
    name:
      | string
      | {
          "en-US": string;
          "vi-VN": string;
        };
    /**
     * Localized text (INV-09): both versions required; limits apply to each.
     */
    group?: {
      "en-US": string;
      "vi-VN": string;
    };
    level?: number;
  }[];
  /**
   * @maxItems 10
   */
  languages?: {
    /**
     * Localized text (INV-09): both versions required; limits apply to each.
     */
    name: {
      "en-US": string;
      "vi-VN": string;
    };
    /**
     * Localized text (INV-09): both versions required; limits apply to each.
     */
    level: {
      "en-US": string;
      "vi-VN": string;
    };
  }[];
  /**
   * @maxItems 20
   */
  certificates?: {
    /**
     * A name (INV-09): one text for both languages, or a version per language.
     */
    name:
      | string
      | {
          "en-US": string;
          "vi-VN": string;
        };
    /**
     * A name (INV-09): one text for both languages, or a version per language.
     */
    issuer:
      | string
      | {
          "en-US": string;
          "vi-VN": string;
        };
    year: number;
  }[];
  /**
   * @maxItems 20
   */
  awards?: {
    /**
     * A name (INV-09): one text for both languages, or a version per language.
     */
    title:
      | string
      | {
          "en-US": string;
          "vi-VN": string;
        };
    /**
     * A name (INV-09): one text for both languages, or a version per language.
     */
    issuer:
      | string
      | {
          "en-US": string;
          "vi-VN": string;
        };
    year: number;
  }[];
}
/**
 * This interface was referenced by `TaroKitDataModel`'s JSON-Schema
 * via the `definition` "policy".
 */
export interface Policy {
  /**
   * Localized text (INV-09): both versions required; limits apply to each.
   */
  title: {
    "en-US": string;
    "vi-VN": string;
  };
  updated: IsoDate;
  /**
   * @minItems 1
   * @maxItems 20
   */
  sections: [
    {
      /**
       * Localized text (INV-09): both versions required; limits apply to each.
       */
      heading: {
        "en-US": string;
        "vi-VN": string;
      };
      /**
       * Localized text (INV-09): both versions required; limits apply to each.
       */
      body: {
        "en-US": string;
        "vi-VN": string;
      };
    },
    ...{
      /**
       * Localized text (INV-09): both versions required; limits apply to each.
       */
      heading: {
        "en-US": string;
        "vi-VN": string;
      };
      /**
       * Localized text (INV-09): both versions required; limits apply to each.
       */
      body: {
        "en-US": string;
        "vi-VN": string;
      };
    }[]
  ];
}
