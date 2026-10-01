/** Generated from original geometry in art/source/wardrobe/prepare.py. */
export type WardrobeSlot = 'outfit' | 'headwear';
export type WardrobeOutfitId = 'maker-hoodie' | 'studio-denim' | 'sprint-jersey' | 'discovery-lab-coat' | 'orbit-suit' | 'colorist-apron';
export type WardrobeHeadwearId = 'trail-cap' | 'signal-headphones';
export type WardrobeItemId = WardrobeOutfitId | WardrobeHeadwearId;
export const wardrobeRigAnchors = {
  "torso": {
    "parent": "actor-torso",
    "origin": [
      0,
      0
    ],
    "pivot": [
      120,
      152
    ],
    "size": [
      240,
      240
    ]
  },
  "head": {
    "parent": "actor-head",
    "origin": [
      0,
      0
    ],
    "pivot": [
      120,
      114
    ],
    "size": [
      240,
      240
    ]
  },
  "left-upper-arm": {
    "parent": "actor-left-shoulder",
    "origin": [
      90,
      123
    ],
    "pivot": [
      8,
      7
    ],
    "size": [
      16,
      56
    ]
  },
  "right-upper-arm": {
    "parent": "actor-right-shoulder",
    "origin": [
      134,
      123
    ],
    "pivot": [
      8,
      7
    ],
    "size": [
      16,
      56
    ]
  },
  "left-forearm": {
    "parent": "actor-left-elbow",
    "origin": [
      90,
      148
    ],
    "pivot": [
      8,
      7
    ],
    "size": [
      16,
      31
    ]
  },
  "right-forearm": {
    "parent": "actor-right-elbow",
    "origin": [
      134,
      148
    ],
    "pivot": [
      8,
      7
    ],
    "size": [
      16,
      31
    ]
  },
  "left-thigh": {
    "parent": "actor-left-hip",
    "origin": [
      97,
      156
    ],
    "pivot": [
      8,
      4
    ],
    "size": [
      17,
      66
    ]
  },
  "right-thigh": {
    "parent": "actor-right-hip",
    "origin": [
      126,
      156
    ],
    "pivot": [
      8,
      4
    ],
    "size": [
      17,
      66
    ]
  },
  "left-shin": {
    "parent": "actor-left-knee",
    "origin": [
      97,
      178
    ],
    "pivot": [
      8,
      4
    ],
    "size": [
      16,
      44
    ]
  },
  "right-shin": {
    "parent": "actor-right-knee",
    "origin": [
      126,
      178
    ],
    "pivot": [
      8,
      4
    ],
    "size": [
      16,
      44
    ]
  }
} as const;
export type WardrobeAnchor = keyof typeof wardrobeRigAnchors;
export interface WardrobeLayer {
  readonly anchor: WardrobeAnchor;
  /** Bounds in the animated parent group's LOCAL coordinates, including sleeve overhang. */
  readonly bounds: { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
  readonly frontSvg: string;
  readonly backSvg: string;
}
export interface WardrobeItem {
  readonly id: WardrobeItemId;
  readonly name: string;
  readonly slot: WardrobeSlot;
  /** Price in the game's earned Sparks currency. */
  readonly price: number;
  readonly description: string;
  readonly playerOnly: true;
  /** Fixed garment colors; skin, hair, and eye choices retain their own palette. */
  readonly colors: readonly string[];
  /** Hide only these standard player parts when this outfit is equipped. */
  readonly replaces: readonly ('shirt' | 'lower-body' | 'tie')[];
  readonly layers: readonly WardrobeLayer[];
  /** Standalone garment thumbnail. Actual avatar rendering uses joint layers. */
  readonly previewSvg: string;
}
export const wardrobeCatalog: readonly WardrobeItem[] = [
  {
    "id": "maker-hoodie",
    "name": "Maker hoodie",
    "slot": "outfit",
    "price": 25,
    "description": "A soft teal hoodie with a roomy pocket and a tiny spark stitch.",
    "playerOnly": true,
    "colors": [
      "#278D8B",
      "#A7DFD2",
      "#34475C"
    ],
    "replaces": [
      "shirt",
      "lower-body",
      "tie"
    ],
    "layers": [
      {
        "anchor": "left-thigh",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 21,
          "height": 34
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-shin",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 20,
          "height": 29
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#273848\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#273848\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>"
      },
      {
        "anchor": "right-thigh",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 21,
          "height": 34
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "right-shin",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 20,
          "height": 29
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#273848\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#273848\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>"
      },
      {
        "anchor": "torso",
        "bounds": {
          "left": 0,
          "top": 0,
          "width": 240,
          "height": 240
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 160 Q120 164 93 160 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M101 115 Q120 101 139 115 L133 128 Q120 137 107 128 Z\" fill=\"#A7DFD2\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M109 120 Q120 130 131 120\" fill=\"none\" stroke=\"#186766\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M111 126 L111 138 M129 126 L129 138\" fill=\"none\" stroke=\"#F6F1DD\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M106 144 Q120 140 134 144 L137 154 Q120 160 103 154 Z\" fill=\"#217B7C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M124 135 L119 141 L124 141 L120 146\" fill=\"none\" stroke=\"#F8C657\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M96 158 L144 158 L144 163 L96 163 Z\" fill=\"#196A6D\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M94 156 Q120 160 146 156 L145 181 L125 182 L121 170 L117 182 L95 181 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 160 Q120 164 93 160 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M101 115 Q120 104 139 115 L135 130 Q120 141 105 130 Z\" fill=\"#A7DFD2\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M96 158 L144 158 L144 163 L96 163 Z\" fill=\"#196A6D\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M94 156 Q120 160 146 156 L145 181 L125 182 L121 170 L117 182 L95 181 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-upper-arm",
        "bounds": {
          "left": -3,
          "top": -5,
          "width": 23,
          "height": 41
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-forearm",
        "bounds": {
          "left": -2,
          "top": -4,
          "width": 20,
          "height": 32
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#A7DFD2\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#A7DFD2\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>"
      },
      {
        "anchor": "right-upper-arm",
        "bounds": {
          "left": -3,
          "top": -5,
          "width": 23,
          "height": 41
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "right-forearm",
        "bounds": {
          "left": -2,
          "top": -4,
          "width": 20,
          "height": 32
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#A7DFD2\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#A7DFD2\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>"
      }
    ],
    "previewSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"73 105 94 119\"><g transform=\"translate(97 156)\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(97 178)\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#273848\" stroke=\"#26384A\" stroke-width=\"1\" /></g><g transform=\"translate(126 156)\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(126 178)\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#273848\" stroke=\"#26384A\" stroke-width=\"1\" /></g><g transform=\"translate(0 0)\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 160 Q120 164 93 160 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M101 115 Q120 101 139 115 L133 128 Q120 137 107 128 Z\" fill=\"#A7DFD2\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M109 120 Q120 130 131 120\" fill=\"none\" stroke=\"#186766\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M111 126 L111 138 M129 126 L129 138\" fill=\"none\" stroke=\"#F6F1DD\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M106 144 Q120 140 134 144 L137 154 Q120 160 103 154 Z\" fill=\"#217B7C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M124 135 L119 141 L124 141 L120 146\" fill=\"none\" stroke=\"#F8C657\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M96 158 L144 158 L144 163 L96 163 Z\" fill=\"#196A6D\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M94 156 Q120 160 146 156 L145 181 L125 182 L121 170 L117 182 L95 181 Z\" fill=\"#34475C\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(90 123)\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(90 148)\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#A7DFD2\" stroke=\"#26384A\" stroke-width=\"1.1\" /></g><g transform=\"translate(134 123)\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(134 148)\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#278D8B\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#A7DFD2\" stroke=\"#26384A\" stroke-width=\"1.1\" /></g></svg>"
  },
  {
    "id": "studio-denim",
    "name": "Studio denim",
    "slot": "outfit",
    "price": 40,
    "description": "An open denim jacket, ivory tee, and warm clay trousers.",
    "playerOnly": true,
    "colors": [
      "#4677AE",
      "#F4EDDC",
      "#B2734E"
    ],
    "replaces": [
      "shirt",
      "lower-body",
      "tie"
    ],
    "layers": [
      {
        "anchor": "left-thigh",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 21,
          "height": 34
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-shin",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 20,
          "height": 29
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#875239\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#875239\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>"
      },
      {
        "anchor": "right-thigh",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 21,
          "height": 34
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "right-shin",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 20,
          "height": 29
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#875239\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#875239\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>"
      },
      {
        "anchor": "torso",
        "bounds": {
          "left": 0,
          "top": 0,
          "width": 240,
          "height": 240
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 160 Q120 164 93 160 Z\" fill=\"#F4EDDC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M97 115 L110 112 L113 163 L94 163 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M130 112 L143 115 L146 163 L127 163 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M110 112 L112 129 L102 121 Z M130 112 L128 129 L139 121 Z\" fill=\"#86B0D2\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"97\" y=\"131\" width=\"12\" height=\"10\" rx=\"1\" fill=\"#5F8DBA\" stroke=\"#26384A\" stroke-width=\"1.5\"/><rect x=\"131\" y=\"131\" width=\"11\" height=\"10\" rx=\"1\" fill=\"#5F8DBA\" stroke=\"#26384A\" stroke-width=\"1.5\"/><path d=\"M99 154 L109 154 M131 154 L141 154\" fill=\"none\" stroke=\"#D4C59A\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"110\" cy=\"143\" r=\"1.5\" fill=\"#E9B774\" stroke=\"#26384A\" stroke-width=\"0.5\"/><circle cx=\"110\" cy=\"153\" r=\"1.5\" fill=\"#E9B774\" stroke=\"#26384A\" stroke-width=\"0.5\"/><path d=\"M94 156 Q120 160 146 156 L145 181 L125 182 L121 170 L117 182 L95 181 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 163 Q120 167 93 163 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M98 126 Q120 135 142 126 M120 132 L120 162\" fill=\"none\" stroke=\"#A3C6DA\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M94 156 Q120 160 146 156 L145 181 L125 182 L121 170 L117 182 L95 181 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-upper-arm",
        "bounds": {
          "left": -3,
          "top": -5,
          "width": 23,
          "height": 41
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M13 1 L14 27\" fill=\"none\" stroke=\"#D4C59A\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M13 1 L14 27\" fill=\"none\" stroke=\"#D4C59A\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-forearm",
        "bounds": {
          "left": -2,
          "top": -4,
          "width": 20,
          "height": 32
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#86B0D2\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#86B0D2\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>"
      },
      {
        "anchor": "right-upper-arm",
        "bounds": {
          "left": -3,
          "top": -5,
          "width": 23,
          "height": 41
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M13 1 L14 27\" fill=\"none\" stroke=\"#D4C59A\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M13 1 L14 27\" fill=\"none\" stroke=\"#D4C59A\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "right-forearm",
        "bounds": {
          "left": -2,
          "top": -4,
          "width": 20,
          "height": 32
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#86B0D2\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#86B0D2\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>"
      }
    ],
    "previewSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"73 105 94 119\"><g transform=\"translate(97 156)\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(97 178)\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#875239\" stroke=\"#26384A\" stroke-width=\"1\" /></g><g transform=\"translate(126 156)\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(126 178)\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#875239\" stroke=\"#26384A\" stroke-width=\"1\" /></g><g transform=\"translate(0 0)\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 160 Q120 164 93 160 Z\" fill=\"#F4EDDC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M97 115 L110 112 L113 163 L94 163 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M130 112 L143 115 L146 163 L127 163 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M110 112 L112 129 L102 121 Z M130 112 L128 129 L139 121 Z\" fill=\"#86B0D2\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"97\" y=\"131\" width=\"12\" height=\"10\" rx=\"1\" fill=\"#5F8DBA\" stroke=\"#26384A\" stroke-width=\"1.5\" /><rect x=\"131\" y=\"131\" width=\"11\" height=\"10\" rx=\"1\" fill=\"#5F8DBA\" stroke=\"#26384A\" stroke-width=\"1.5\" /><path d=\"M99 154 L109 154 M131 154 L141 154\" fill=\"none\" stroke=\"#D4C59A\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><circle cx=\"110\" cy=\"143\" r=\"1.5\" fill=\"#E9B774\" stroke=\"#26384A\" stroke-width=\"0.5\" /><circle cx=\"110\" cy=\"153\" r=\"1.5\" fill=\"#E9B774\" stroke=\"#26384A\" stroke-width=\"0.5\" /><path d=\"M94 156 Q120 160 146 156 L145 181 L125 182 L121 170 L117 182 L95 181 Z\" fill=\"#B2734E\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(90 123)\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M13 1 L14 27\" fill=\"none\" stroke=\"#D4C59A\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(90 148)\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#86B0D2\" stroke=\"#26384A\" stroke-width=\"1.1\" /></g><g transform=\"translate(134 123)\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M13 1 L14 27\" fill=\"none\" stroke=\"#D4C59A\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(134 148)\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#4677AE\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#86B0D2\" stroke=\"#26384A\" stroke-width=\"1.1\" /></g></svg>"
  },
  {
    "id": "sprint-jersey",
    "name": "Sprint jersey",
    "slot": "outfit",
    "price": 35,
    "description": "A coral team jersey with cream stripes and easy-moving shorts.",
    "playerOnly": true,
    "colors": [
      "#E96955",
      "#FFF0C9",
      "#3C5061"
    ],
    "replaces": [
      "shirt",
      "lower-body",
      "tie"
    ],
    "layers": [
      {
        "anchor": "torso",
        "bounds": {
          "left": 0,
          "top": 0,
          "width": 240,
          "height": 240
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 158 Q120 162 93 158 Z\" fill=\"#E96955\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M98 115 L109 112 L106 132 L94 133 Z M131 112 L143 115 L146 133 L134 132 Z\" fill=\"#FFF0C9\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M110 112 Q120 122 130 112\" fill=\"none\" stroke=\"#973F45\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M112 135 L120 143 L128 135 L125 149 L115 149 Z\" fill=\"#FFF0C9\" stroke=\"#26384A\" stroke-width=\"1.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M94 157 L146 157\" fill=\"none\" stroke=\"#973F45\" stroke-width=\"2.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M94 156 Q120 160 146 156 L145 181 L125 182 L121 170 L117 182 L95 181 Z\" fill=\"#3C5061\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M97 158 L98 177 M143 158 L142 177\" fill=\"none\" stroke=\"#F3DFAF\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 158 Q120 162 93 158 Z\" fill=\"#E96955\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M104 124 L120 135 L136 124\" fill=\"none\" stroke=\"#FFF0C9\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M94 157 L146 157\" fill=\"none\" stroke=\"#973F45\" stroke-width=\"2.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M94 156 Q120 160 146 156 L145 181 L125 182 L121 170 L117 182 L95 181 Z\" fill=\"#3C5061\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M97 158 L98 177 M143 158 L142 177\" fill=\"none\" stroke=\"#F3DFAF\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-upper-arm",
        "bounds": {
          "left": -4,
          "top": -5,
          "width": 24,
          "height": 27
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-4 -5 24 27\"><path d=\"M1 0 Q8 -4 15 0 L18 14 Q8 18 -2 14 Z\" fill=\"#E96955\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M-1 11 Q8 15 17 11 L18 15 Q8 19 -2 15 Z\" fill=\"#FFF0C9\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-4 -5 24 27\"><path d=\"M1 0 Q8 -4 15 0 L18 14 Q8 18 -2 14 Z\" fill=\"#E96955\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M-1 11 Q8 15 17 11 L18 15 Q8 19 -2 15 Z\" fill=\"#FFF0C9\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "right-upper-arm",
        "bounds": {
          "left": -4,
          "top": -5,
          "width": 24,
          "height": 27
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-4 -5 24 27\"><path d=\"M1 0 Q8 -4 15 0 L18 14 Q8 18 -2 14 Z\" fill=\"#E96955\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M-1 11 Q8 15 17 11 L18 15 Q8 19 -2 15 Z\" fill=\"#FFF0C9\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-4 -5 24 27\"><path d=\"M1 0 Q8 -4 15 0 L18 14 Q8 18 -2 14 Z\" fill=\"#E96955\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M-1 11 Q8 15 17 11 L18 15 Q8 19 -2 15 Z\" fill=\"#FFF0C9\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      }
    ],
    "previewSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"73 105 94 119\"><g transform=\"translate(0 0)\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 158 Q120 162 93 158 Z\" fill=\"#E96955\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M98 115 L109 112 L106 132 L94 133 Z M131 112 L143 115 L146 133 L134 132 Z\" fill=\"#FFF0C9\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M110 112 Q120 122 130 112\" fill=\"none\" stroke=\"#973F45\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M112 135 L120 143 L128 135 L125 149 L115 149 Z\" fill=\"#FFF0C9\" stroke=\"#26384A\" stroke-width=\"1.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M94 157 L146 157\" fill=\"none\" stroke=\"#973F45\" stroke-width=\"2.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M94 156 Q120 160 146 156 L145 181 L125 182 L121 170 L117 182 L95 181 Z\" fill=\"#3C5061\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M97 158 L98 177 M143 158 L142 177\" fill=\"none\" stroke=\"#F3DFAF\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(90 123)\"><path d=\"M1 0 Q8 -4 15 0 L18 14 Q8 18 -2 14 Z\" fill=\"#E96955\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M-1 11 Q8 15 17 11 L18 15 Q8 19 -2 15 Z\" fill=\"#FFF0C9\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(134 123)\"><path d=\"M1 0 Q8 -4 15 0 L18 14 Q8 18 -2 14 Z\" fill=\"#E96955\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M-1 11 Q8 15 17 11 L18 15 Q8 19 -2 15 Z\" fill=\"#FFF0C9\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>"
  },
  {
    "id": "discovery-lab-coat",
    "name": "Discovery lab coat",
    "slot": "outfit",
    "price": 55,
    "description": "A mint-collared lab coat with large pockets for small discoveries.",
    "playerOnly": true,
    "colors": [
      "#F7F8EC",
      "#5CBFA7",
      "#405777"
    ],
    "replaces": [
      "shirt",
      "lower-body",
      "tie"
    ],
    "layers": [
      {
        "anchor": "left-thigh",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 21,
          "height": 34
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#405777\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#405777\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-shin",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 20,
          "height": 29
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#405777\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#2E4058\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#405777\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#2E4058\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>"
      },
      {
        "anchor": "right-thigh",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 21,
          "height": 34
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#405777\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#405777\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "right-shin",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 20,
          "height": 29
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#405777\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#2E4058\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#405777\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#2E4058\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>"
      },
      {
        "anchor": "torso",
        "bounds": {
          "left": 0,
          "top": 0,
          "width": 240,
          "height": 240
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 160 Q120 164 93 160 Z\" fill=\"#5CBFA7\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M96 115 L108 112 L118 142 L117 186 L91 181 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M132 112 L144 115 L149 181 L123 186 L122 142 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M107 112 L119 137 L108 132 L103 120 Z M133 112 L121 137 L132 132 L137 120 Z\" fill=\"#C8E5DC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"95\" y=\"156\" width=\"16\" height=\"12\" rx=\"2\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.5\"/><rect x=\"129\" y=\"156\" width=\"15\" height=\"12\" rx=\"2\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.5\"/><rect x=\"130\" y=\"134\" width=\"11\" height=\"10\" rx=\"1\" fill=\"#C8E5DC\" stroke=\"#26384A\" stroke-width=\"1.5\"/><path d=\"M133 134 L133 128 M138 134 L138 129\" fill=\"none\" stroke=\"#327D80\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"121\" cy=\"148\" r=\"1.5\" fill=\"#718D88\" stroke=\"#26384A\" stroke-width=\"0.5\"/><circle cx=\"121\" cy=\"159\" r=\"1.5\" fill=\"#718D88\" stroke=\"#26384A\" stroke-width=\"0.5\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 181 Q120 185 93 181 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M101 123 Q120 129 139 123 M120 130 L120 182\" fill=\"none\" stroke=\"#8EAAA4\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-upper-arm",
        "bounds": {
          "left": -3,
          "top": -5,
          "width": 23,
          "height": 41
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-forearm",
        "bounds": {
          "left": -2,
          "top": -4,
          "width": 20,
          "height": 32
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#C8E5DC\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#C8E5DC\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>"
      },
      {
        "anchor": "right-upper-arm",
        "bounds": {
          "left": -3,
          "top": -5,
          "width": 23,
          "height": 41
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "right-forearm",
        "bounds": {
          "left": -2,
          "top": -4,
          "width": 20,
          "height": 32
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#C8E5DC\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#C8E5DC\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>"
      }
    ],
    "previewSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"73 105 94 119\"><g transform=\"translate(97 156)\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#405777\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(97 178)\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#405777\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#2E4058\" stroke=\"#26384A\" stroke-width=\"1\" /></g><g transform=\"translate(126 156)\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#405777\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(126 178)\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#405777\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#2E4058\" stroke=\"#26384A\" stroke-width=\"1\" /></g><g transform=\"translate(0 0)\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 160 Q120 164 93 160 Z\" fill=\"#5CBFA7\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M96 115 L108 112 L118 142 L117 186 L91 181 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M132 112 L144 115 L149 181 L123 186 L122 142 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M107 112 L119 137 L108 132 L103 120 Z M133 112 L121 137 L132 132 L137 120 Z\" fill=\"#C8E5DC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"95\" y=\"156\" width=\"16\" height=\"12\" rx=\"2\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.5\" /><rect x=\"129\" y=\"156\" width=\"15\" height=\"12\" rx=\"2\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.5\" /><rect x=\"130\" y=\"134\" width=\"11\" height=\"10\" rx=\"1\" fill=\"#C8E5DC\" stroke=\"#26384A\" stroke-width=\"1.5\" /><path d=\"M133 134 L133 128 M138 134 L138 129\" fill=\"none\" stroke=\"#327D80\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><circle cx=\"121\" cy=\"148\" r=\"1.5\" fill=\"#718D88\" stroke=\"#26384A\" stroke-width=\"0.5\" /><circle cx=\"121\" cy=\"159\" r=\"1.5\" fill=\"#718D88\" stroke=\"#26384A\" stroke-width=\"0.5\" /></g><g transform=\"translate(90 123)\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(90 148)\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#C8E5DC\" stroke=\"#26384A\" stroke-width=\"1.1\" /></g><g transform=\"translate(134 123)\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(134 148)\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#F7F8EC\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#C8E5DC\" stroke=\"#26384A\" stroke-width=\"1.1\" /></g></svg>"
  },
  {
    "id": "orbit-suit",
    "name": "Orbit suit",
    "slot": "outfit",
    "price": 100,
    "description": "A padded space suit with an orange harness and mission pack.",
    "playerOnly": true,
    "colors": [
      "#DFE8F0",
      "#F09D54",
      "#48678B"
    ],
    "replaces": [
      "shirt",
      "lower-body",
      "tie"
    ],
    "layers": [
      {
        "anchor": "left-thigh",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 21,
          "height": 34
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M3 2 L3 27\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M3 2 L3 27\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-shin",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 20,
          "height": 29
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1\"/><path d=\"M3 1 L3 20\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1\"/><path d=\"M3 1 L3 20\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "right-thigh",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 21,
          "height": 34
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M3 2 L3 27\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M3 2 L3 27\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "right-shin",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 20,
          "height": 29
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1\"/><path d=\"M3 1 L3 20\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1\"/><path d=\"M3 1 L3 20\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "torso",
        "bounds": {
          "left": 0,
          "top": 0,
          "width": 240,
          "height": 240
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 163 Q120 167 93 163 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M102 115 L108 112 L115 151 L110 160 L105 145 Z M132 112 L138 115 L135 145 L130 160 L125 151 Z\" fill=\"#F09D54\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M110 114 Q120 125 130 114\" fill=\"none\" stroke=\"#48678B\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"111\" y=\"130\" width=\"18\" height=\"16\" rx=\"3\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1.5\"/><rect x=\"115\" y=\"134\" width=\"10\" height=\"4\" rx=\"1\" fill=\"#B5E4E1\" stroke=\"none\" stroke-width=\"1.5\"/><circle cx=\"103\" cy=\"131\" r=\"4\" fill=\"#F09D54\" stroke=\"#26384A\" stroke-width=\"1.2\"/><path d=\"M100 130 Q103 126 106 130 M100 132 Q103 136 106 132\" fill=\"none\" stroke=\"#F5F5E9\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"95\" y=\"158\" width=\"50\" height=\"7\" rx=\"2\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1.5\"/><rect x=\"115\" y=\"159\" width=\"10\" height=\"5\" rx=\"1\" fill=\"#F09D54\" stroke=\"#26384A\" stroke-width=\"0.8\"/><path d=\"M94 156 Q120 160 146 156 L145 181 L125 182 L121 170 L117 182 L95 181 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 163 Q120 167 93 163 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"104\" y=\"119\" width=\"32\" height=\"33\" rx=\"7\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1.5\"/><rect x=\"110\" y=\"126\" width=\"20\" height=\"8\" rx=\"2\" fill=\"#B5E4E1\" stroke=\"#26384A\" stroke-width=\"1.5\"/><path d=\"M110 140 L130 140 M110 144 L130 144\" fill=\"none\" stroke=\"#AABBC9\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"95\" y=\"158\" width=\"50\" height=\"7\" rx=\"2\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1.5\"/><path d=\"M94 156 Q120 160 146 156 L145 181 L125 182 L121 170 L117 182 L95 181 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-upper-arm",
        "bounds": {
          "left": -3,
          "top": -5,
          "width": 23,
          "height": 41
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M13 1 L14 27\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M13 1 L14 27\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-forearm",
        "bounds": {
          "left": -2,
          "top": -4,
          "width": 20,
          "height": 32
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>"
      },
      {
        "anchor": "right-upper-arm",
        "bounds": {
          "left": -3,
          "top": -5,
          "width": 23,
          "height": 41
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M13 1 L14 27\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-3 -5 23 41\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M13 1 L14 27\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "right-forearm",
        "bounds": {
          "left": -2,
          "top": -4,
          "width": 20,
          "height": 32
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -4 20 32\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1.1\"/></svg>"
      }
    ],
    "previewSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"73 105 94 119\"><g transform=\"translate(97 156)\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M3 2 L3 27\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(97 178)\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1\" /><path d=\"M3 1 L3 20\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(126 156)\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M3 2 L3 27\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(126 178)\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1\" /><path d=\"M3 1 L3 20\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(0 0)\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 163 Q120 167 93 163 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M102 115 L108 112 L115 151 L110 160 L105 145 Z M132 112 L138 115 L135 145 L130 160 L125 151 Z\" fill=\"#F09D54\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M110 114 Q120 125 130 114\" fill=\"none\" stroke=\"#48678B\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"111\" y=\"130\" width=\"18\" height=\"16\" rx=\"3\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1.5\" /><rect x=\"115\" y=\"134\" width=\"10\" height=\"4\" rx=\"1\" fill=\"#B5E4E1\" stroke=\"none\" stroke-width=\"1.5\" /><circle cx=\"103\" cy=\"131\" r=\"4\" fill=\"#F09D54\" stroke=\"#26384A\" stroke-width=\"1.2\" /><path d=\"M100 130 Q103 126 106 130 M100 132 Q103 136 106 132\" fill=\"none\" stroke=\"#F5F5E9\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"95\" y=\"158\" width=\"50\" height=\"7\" rx=\"2\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1.5\" /><rect x=\"115\" y=\"159\" width=\"10\" height=\"5\" rx=\"1\" fill=\"#F09D54\" stroke=\"#26384A\" stroke-width=\"0.8\" /><path d=\"M94 156 Q120 160 146 156 L145 181 L125 182 L121 170 L117 182 L95 181 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(90 123)\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M13 1 L14 27\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(90 148)\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1.1\" /></g><g transform=\"translate(134 123)\"><path d=\"M0 0 Q8 -4 16 0 L17 31 Q8 34 -1 31 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M13 1 L14 27\" fill=\"none\" stroke=\"#F09D54\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(134 148)\"><path d=\"M0 0 Q8 -3 16 0 L15 20 Q8 23 1 20 Z\" fill=\"#DFE8F0\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"18\" width=\"14\" height=\"6\" rx=\"2\" fill=\"#48678B\" stroke=\"#26384A\" stroke-width=\"1.1\" /></g></svg>"
  },
  {
    "id": "colorist-apron",
    "name": "Colorist apron",
    "slot": "outfit",
    "price": 65,
    "description": "An ochre apron with a paintbrush pocket over a lilac shirt.",
    "playerOnly": true,
    "colors": [
      "#DFAA4D",
      "#B7A2CD",
      "#56687A"
    ],
    "replaces": [
      "shirt",
      "lower-body",
      "tie"
    ],
    "layers": [
      {
        "anchor": "left-thigh",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 21,
          "height": 34
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#56687A\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#56687A\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-shin",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 20,
          "height": 29
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#56687A\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#435463\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#56687A\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#435463\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>"
      },
      {
        "anchor": "right-thigh",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 21,
          "height": 34
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#56687A\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 21 34\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#56687A\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "right-shin",
        "bounds": {
          "left": -2,
          "top": -2,
          "width": 20,
          "height": 29
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#56687A\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#435463\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-2 -2 20 29\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#56687A\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#435463\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>"
      },
      {
        "anchor": "torso",
        "bounds": {
          "left": 0,
          "top": 0,
          "width": 240,
          "height": 240
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 160 Q120 164 93 160 Z\" fill=\"#B7A2CD\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M106 115 L112 115 L113 136 L127 136 L128 115 L134 115 L137 179 Q120 186 103 179 Z\" fill=\"#DFAA4D\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"109\" y=\"148\" width=\"22\" height=\"17\" rx=\"3\" fill=\"#E7BC70\" stroke=\"#26384A\" stroke-width=\"1.5\"/><path d=\"M122 148 L124 135\" fill=\"none\" stroke=\"#654A3F\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M123 136 L124 130 L127 130 L126 137 Z\" fill=\"#EBA986\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"114\" cy=\"142\" r=\"2.5\" fill=\"#6CA3C9\" stroke=\"none\" stroke-width=\"1.4\"/><circle cx=\"128\" cy=\"170\" r=\"3\" fill=\"#E98171\" stroke=\"none\" stroke-width=\"1.4\"/><path d=\"M108 172 L114 170\" fill=\"none\" stroke=\"#79AE9B\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 160 Q120 164 93 160 Z\" fill=\"#B7A2CD\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M106 114 L132 157 M134 114 L108 157\" fill=\"none\" stroke=\"#DFAA4D\" stroke-width=\"4.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M106 157 L134 157 L136 179 Q120 186 104 179 Z\" fill=\"#DFAA4D\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "left-upper-arm",
        "bounds": {
          "left": -4,
          "top": -5,
          "width": 24,
          "height": 27
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-4 -5 24 27\"><path d=\"M1 0 Q8 -4 15 0 L18 14 Q8 18 -2 14 Z\" fill=\"#B7A2CD\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M-1 11 Q8 15 17 11 L18 15 Q8 19 -2 15 Z\" fill=\"#DDD0E8\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-4 -5 24 27\"><path d=\"M1 0 Q8 -4 15 0 L18 14 Q8 18 -2 14 Z\" fill=\"#B7A2CD\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M-1 11 Q8 15 17 11 L18 15 Q8 19 -2 15 Z\" fill=\"#DDD0E8\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      },
      {
        "anchor": "right-upper-arm",
        "bounds": {
          "left": -4,
          "top": -5,
          "width": 24,
          "height": 27
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-4 -5 24 27\"><path d=\"M1 0 Q8 -4 15 0 L18 14 Q8 18 -2 14 Z\" fill=\"#B7A2CD\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M-1 11 Q8 15 17 11 L18 15 Q8 19 -2 15 Z\" fill=\"#DDD0E8\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-4 -5 24 27\"><path d=\"M1 0 Q8 -4 15 0 L18 14 Q8 18 -2 14 Z\" fill=\"#B7A2CD\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M-1 11 Q8 15 17 11 L18 15 Q8 19 -2 15 Z\" fill=\"#DDD0E8\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
      }
    ],
    "previewSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"73 105 94 119\"><g transform=\"translate(97 156)\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#56687A\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(97 178)\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#56687A\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#435463\" stroke=\"#26384A\" stroke-width=\"1\" /></g><g transform=\"translate(126 156)\"><path d=\"M0 0 L17 0 L17 28 Q8 31 0 28 Z\" fill=\"#56687A\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(126 178)\"><path d=\"M0 0 L16 0 L15 23 Q8 25 1 23 Z\" fill=\"#56687A\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"1\" y=\"21\" width=\"14\" height=\"4\" rx=\"1\" fill=\"#435463\" stroke=\"#26384A\" stroke-width=\"1\" /></g><g transform=\"translate(0 0)\"><path d=\"M97 115 L109 111 Q120 119 131 111 L143 115 L147 160 Q120 164 93 160 Z\" fill=\"#B7A2CD\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M106 115 L112 115 L113 136 L127 136 L128 115 L134 115 L137 179 Q120 186 103 179 Z\" fill=\"#DFAA4D\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"109\" y=\"148\" width=\"22\" height=\"17\" rx=\"3\" fill=\"#E7BC70\" stroke=\"#26384A\" stroke-width=\"1.5\" /><path d=\"M122 148 L124 135\" fill=\"none\" stroke=\"#654A3F\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M123 136 L124 130 L127 130 L126 137 Z\" fill=\"#EBA986\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><circle cx=\"114\" cy=\"142\" r=\"2.5\" fill=\"#6CA3C9\" stroke=\"none\" stroke-width=\"1.4\" /><circle cx=\"128\" cy=\"170\" r=\"3\" fill=\"#E98171\" stroke=\"none\" stroke-width=\"1.4\" /><path d=\"M108 172 L114 170\" fill=\"none\" stroke=\"#79AE9B\" stroke-width=\"2.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(90 123)\"><path d=\"M1 0 Q8 -4 15 0 L18 14 Q8 18 -2 14 Z\" fill=\"#B7A2CD\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M-1 11 Q8 15 17 11 L18 15 Q8 19 -2 15 Z\" fill=\"#DDD0E8\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g><g transform=\"translate(134 123)\"><path d=\"M1 0 Q8 -4 15 0 L18 14 Q8 18 -2 14 Z\" fill=\"#B7A2CD\" stroke=\"#26384A\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M-1 11 Q8 15 17 11 L18 15 Q8 19 -2 15 Z\" fill=\"#DDD0E8\" stroke=\"#26384A\" stroke-width=\"1\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>"
  },
  {
    "id": "trail-cap",
    "name": "Trail cap",
    "slot": "headwear",
    "price": 30,
    "description": "An olive canvas cap with a sand brim and an original trail badge.",
    "playerOnly": true,
    "colors": [
      "#647D51",
      "#E3C183",
      "#F6E8BC"
    ],
    "replaces": [],
    "layers": [
      {
        "anchor": "head",
        "bounds": {
          "left": 0,
          "top": 0,
          "width": 240,
          "height": 240
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M72 49 Q75 20 111 19 Q149 14 160 48 L146 58 L85 57 Z\" fill=\"#647D51\" stroke=\"#26384A\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M112 20 Q124 35 122 51 M79 47 Q113 40 152 48\" fill=\"none\" stroke=\"#B7C898\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M85 49 Q126 42 160 50 L178 58 Q147 70 111 60 L78 59 Z\" fill=\"#E3C183\" stroke=\"#26384A\" stroke-width=\"2.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M107 29 L116 26 L124 31 L122 40 L113 43 L106 37 Z\" fill=\"#F6E8BC\" stroke=\"#26384A\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M111 36 L115 31 L119 36\" fill=\"none\" stroke=\"#647D51\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M72 49 Q75 20 111 19 Q149 14 160 48 L146 58 L85 57 Z\" fill=\"#647D51\" stroke=\"#26384A\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"104\" y=\"43\" width=\"29\" height=\"8\" rx=\"3\" fill=\"#E3C183\" stroke=\"#26384A\" stroke-width=\"1.5\"/><circle cx=\"118\" cy=\"24\" r=\"2.5\" fill=\"#E3C183\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>"
      }
    ],
    "previewSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"53 11 134 94\"><g transform=\"translate(0 0)\"><path d=\"M72 49 Q75 20 111 19 Q149 14 160 48 L146 58 L85 57 Z\" fill=\"#647D51\" stroke=\"#26384A\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M112 20 Q124 35 122 51 M79 47 Q113 40 152 48\" fill=\"none\" stroke=\"#B7C898\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M85 49 Q126 42 160 50 L178 58 Q147 70 111 60 L78 59 Z\" fill=\"#E3C183\" stroke=\"#26384A\" stroke-width=\"2.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M107 29 L116 26 L124 31 L122 40 L113 43 L106 37 Z\" fill=\"#F6E8BC\" stroke=\"#26384A\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M111 36 L115 31 L119 36\" fill=\"none\" stroke=\"#647D51\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></g></svg>"
  },
  {
    "id": "signal-headphones",
    "name": "Signal headphones",
    "slot": "headwear",
    "price": 45,
    "description": "Plum headphones with mint cushions and a small listening mic.",
    "playerOnly": true,
    "colors": [
      "#59588A",
      "#A3DDD1",
      "#3A405F"
    ],
    "replaces": [],
    "layers": [
      {
        "anchor": "head",
        "bounds": {
          "left": 0,
          "top": 0,
          "width": 240,
          "height": 240
        },
        "frontSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M64 69 L66 49 Q73 17 119 17 Q165 17 174 49 L177 70\" fill=\"none\" stroke=\"#3A405F\" stroke-width=\"9\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M70 45 Q83 23 119 23 Q155 23 170 46\" fill=\"none\" stroke=\"#9F9CCA\" stroke-width=\"3.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"58\" y=\"53\" width=\"19\" height=\"39\" rx=\"8\" fill=\"#59588A\" stroke=\"#26384A\" stroke-width=\"2.2\"/><rect x=\"166\" y=\"53\" width=\"19\" height=\"39\" rx=\"8\" fill=\"#59588A\" stroke=\"#26384A\" stroke-width=\"2.2\"/><rect x=\"62\" y=\"61\" width=\"9\" height=\"21\" rx=\"4\" fill=\"#A3DDD1\" stroke=\"#26384A\" stroke-width=\"1.4\"/><rect x=\"172\" y=\"61\" width=\"9\" height=\"21\" rx=\"4\" fill=\"#A3DDD1\" stroke=\"#26384A\" stroke-width=\"1.4\"/><path d=\"M176 85 Q178 102 158 105 L149 105\" fill=\"none\" stroke=\"#3A405F\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"145\" y=\"102\" width=\"11\" height=\"6\" rx=\"3\" fill=\"#A3DDD1\" stroke=\"#26384A\" stroke-width=\"1\"/></svg>",
        "backSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\"><path d=\"M64 69 L66 49 Q73 17 119 17 Q165 17 174 49 L177 70\" fill=\"none\" stroke=\"#3A405F\" stroke-width=\"9\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"58\" y=\"53\" width=\"19\" height=\"39\" rx=\"8\" fill=\"#59588A\" stroke=\"#26384A\" stroke-width=\"2.2\"/><rect x=\"166\" y=\"53\" width=\"19\" height=\"39\" rx=\"8\" fill=\"#59588A\" stroke=\"#26384A\" stroke-width=\"2.2\"/><rect x=\"62\" y=\"61\" width=\"9\" height=\"21\" rx=\"4\" fill=\"#A3DDD1\" stroke=\"#26384A\" stroke-width=\"1.4\"/><rect x=\"172\" y=\"61\" width=\"9\" height=\"21\" rx=\"4\" fill=\"#A3DDD1\" stroke=\"#26384A\" stroke-width=\"1.4\"/></svg>"
      }
    ],
    "previewSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"53 11 134 94\"><g transform=\"translate(0 0)\"><path d=\"M64 69 L66 49 Q73 17 119 17 Q165 17 174 49 L177 70\" fill=\"none\" stroke=\"#3A405F\" stroke-width=\"9\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><path d=\"M70 45 Q83 23 119 23 Q155 23 170 46\" fill=\"none\" stroke=\"#9F9CCA\" stroke-width=\"3.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"58\" y=\"53\" width=\"19\" height=\"39\" rx=\"8\" fill=\"#59588A\" stroke=\"#26384A\" stroke-width=\"2.2\" /><rect x=\"166\" y=\"53\" width=\"19\" height=\"39\" rx=\"8\" fill=\"#59588A\" stroke=\"#26384A\" stroke-width=\"2.2\" /><rect x=\"62\" y=\"61\" width=\"9\" height=\"21\" rx=\"4\" fill=\"#A3DDD1\" stroke=\"#26384A\" stroke-width=\"1.4\" /><rect x=\"172\" y=\"61\" width=\"9\" height=\"21\" rx=\"4\" fill=\"#A3DDD1\" stroke=\"#26384A\" stroke-width=\"1.4\" /><path d=\"M176 85 Q178 102 158 105 L149 105\" fill=\"none\" stroke=\"#3A405F\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /><rect x=\"145\" y=\"102\" width=\"11\" height=\"6\" rx=\"3\" fill=\"#A3DDD1\" stroke=\"#26384A\" stroke-width=\"1\" /></g></svg>"
  }
];

export function findWardrobeItem(id: unknown): WardrobeItem | undefined {
  return wardrobeCatalog.find((item) => item.id === id);
}

export function isWardrobeItemId(id: unknown): id is WardrobeItemId {
  return typeof id === 'string' && findWardrobeItem(id) !== undefined;
}

/** Resolve a group once; its existing animated parent owns all movement. */
export function wardrobeLayersForAnchor(id: unknown, anchor: WardrobeAnchor): readonly WardrobeLayer[] {
  return findWardrobeItem(id)?.layers.filter((layer) => layer.anchor === anchor) ?? [];
}
