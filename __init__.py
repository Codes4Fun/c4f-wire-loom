import logging

# borrowed from derfuu_comfyui_moddednodes
class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

ANY = AnyType("*")

# MARK: Basic Nodes

class LoomInNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
            },
            "optional": {
                "loom": ("LOOM",),
                "input": ("*",),
                "label": ("STRING", {"default": ""})
            }
        }

    RETURN_TYPES = ("LOOM",)
    FUNCTION = "insert"
    CATEGORY = "utils/route"

    def insert(self, loom=None, input=None, label=""):
        if input != None and not label:
            raise ValueError("Missing label for input.")

        # If no existing loom, create a new one
        new_loom = loom.copy() if loom else {}

        # Add the input to the loom
        if label:
            new_loom[label] = input

        return (new_loom,)


class LoomJoinNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "optional": {
                "loom1": ("LOOM",),
                "loom2": ("LOOM",),
            }
        }

    RETURN_TYPES = ("LOOM",)
    FUNCTION = "loom_join"
    CATEGORY = "utils/route"

    def loom_join(self, loom1=None, loom2=None):
        if not loom1:
            if not loom2:
                return ({},)
            return (loom2.copy(),)
        if not loom2:
            return (loom1.copy(),)
        loom = {**loom1, **loom2}
        return (loom,)


class LoomSplitNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "optional": {
                "loom": ("LOOM",),
            }
        }

    RETURN_TYPES = ("LOOM","LOOM", "LOOM")
    FUNCTION = "loom_split"
    CATEGORY = "utils/route"

    def loom_split(self, loom=None):
        if not loom:
            return({}, {}, {})
        return (loom.copy(), loom.copy(), loom.copy())


class LoomOutNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "loom": ("LOOM",),
            },
            "optional": {
                "label": ("STRING", {"default": ""})
            }
        }

    RETURN_TYPES = ("LOOM", ANY, "BOOLEAN")
    RETURN_NAMES = ("LOOM", "ANY", "exists")
    FUNCTION = "split"
    CATEGORY = "utils/route"

    def split(self, loom, label):
        if label not in loom:
            return (loom, None, False)
        wire = loom.get(label)
        return (loom, wire, wire != None)

# MARK: Basic Export

WEB_DIRECTORY = "./web/comfyui"

NODE_CLASS_MAPPINGS = {
    "LoomInNode":    LoomInNode,
    "LoomJoinNode":  LoomJoinNode,
    "LoomSplitNode": LoomSplitNode,
    "LoomOutNode":   LoomOutNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LoomInNode":    "Loom In",
    "LoomJoinNode":  "Loom Join",
    "LoomSplitNode": "Loom Split",
    "LoomOutNode":   "Loom Out",
}

# MARK: Type Nodes

def create_loom_in_class(base_type):
    type_name = base_type[0]
    base_type = base_type[1]
    class LoomInNode:
        @classmethod
        def INPUT_TYPES(cls):
            return {
                "required": {
                },
                "optional": {
                    "loom": ("LOOM",),
                    base_type.lower(): (base_type,),
                    "label": ("STRING", {"default": ""})
                }
            }

        RETURN_TYPES = ("LOOM",)
        FUNCTION = "insert"
        CATEGORY = "utils/route"

        def insert(self, loom=None, **kwargs):
            new_loom = {} if loom is None else loom.copy()
            type_value = kwargs.get(base_type.lower())
            label = kwargs.get("label", "")
            key = f"{base_type}_{label}" if label else base_type
            new_loom[key] = type_value
            return (new_loom,)
    
    # Set the class name dynamically
    LoomInNode.__name__ = f"LoomIn{type_name}Node"
    return LoomInNode

def create_loom_out_class(base_type):
    type_name = base_type[0]
    base_type = base_type[1]
    class LoomOutNode:
        @classmethod
        def INPUT_TYPES(cls):
            return {
                "required": {
                    "loom": ("LOOM",),
                },
                "optional": {
                    "label": ("STRING", {"default": ""}),
                }
            }

        RETURN_TYPES = ("LOOM", base_type, "BOOLEAN")
        RETURN_NAMES = ("LOOM", base_type, "exists")
        FUNCTION = "split"
        CATEGORY = "utils/route"

        def split(self, loom, label):
            key = f"{base_type}_{label}" if label else base_type
            if key not in loom:
                return (loom, None, False)
            wire = loom.get(key)
            return (loom, wire, wire != None)
    
    # Set the class name dynamically
    LoomOutNode.__name__ = f"LoomOut{type_name}Node"
    return LoomOutNode

# Create classes for different types
types_to_create = [
    ("Model","MODEL"),
    ("Clip","CLIP"),
    ("VAE","VAE"),
    ("Conditioning","CONDITIONING"),
    ("Image","IMAGE"),
    ("Audio","AUDIO"),
    ("Latent","LATENT"),
    ("Sampler","SAMPLER"),
    ("Sigmas","SIGMAS"),
    ("Noise","NOISE"),
    ("Mask", "MASK"),
]

loom_classes = {}

for base_type in types_to_create:
    name = base_type[0]
    loom_in = create_loom_in_class(base_type)
    loom_out = create_loom_out_class(base_type)
    loom_in_name = f"LoomIn{name}Node"
    loom_out_name = f"LoomOut{name}Node"
    loom_classes[loom_in_name] = loom_in
    loom_classes[loom_out_name] = loom_out
    NODE_CLASS_MAPPINGS[loom_in_name] = loom_in
    NODE_CLASS_MAPPINGS[loom_out_name] = loom_out
    NODE_DISPLAY_NAME_MAPPINGS[loom_in_name] = f"Loom {name} In"
    NODE_DISPLAY_NAME_MAPPINGS[loom_out_name] = f"Loom {name} Out"

# Add the classes to the current module's namespace
globals().update(loom_classes)
