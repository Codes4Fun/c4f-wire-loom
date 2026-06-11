
# Wire Loom Nodes

The purpose of a wire loom (also known as a wire sleeve) is to organize, bundle, and protect wires. It can declutter your workflow, but also makes subgraphs more useful for creating custom interfaces.

What are the advantages of these over Set/Get Nodes? There is a lot of overlap but it simplifies some things better.

- [Status](#status)
- [Detailed Explanation](#detailed-explanation)
- [Simple Tutorial](#simple-tutorial)
- [Gallery and Demos](#gallery-and-demos)

## Status

It's completely functional but needs some optimization.

Nodes 2.0 has bugs that make using loom nodes a little harder, for example if you try to move a node by clicking and dragging the arrow icon, Nodes 2.0 will toggle node collapse, something that doesn't happen to the original node system. I may create a workaround for that issue.

## Detailed Description

Let's say we want to organize our nodes such that we have a bunch related to our prompts, image resolution, batch, and seed control. Another group for model related settings. And finally nodes for sampling. You would end up with something like this:

<img width="1606" height="664" alt="sorted" src="https://github.com/user-attachments/assets/ed055165-c63e-454d-b2a0-acb221338b01" />

If you tried to make that into subgraphs you would end up with this:

<img width="988" height="396" alt="without-wire-loom" src="https://github.com/user-attachments/assets/4c7ae84d-8216-4eca-9a50-2e9c1e3a81d4" />

If you use looms your graph will look like this:

<img width="1655" height="600" alt="sorted-loomed" src="https://github.com/user-attachments/assets/626f7bfa-8c6b-495d-9396-cdc0066c1ecf" />

And if convert your groups into subgraphs and connect up the widgets you can end up with this:

<img width="988" height="404" alt="with-wire-loom" src="https://github.com/user-attachments/assets/c1674fa6-2510-48a7-9a3a-337185733178" />

To take that a step further you could use the same prompt subgraph to go through multiple model/sampler subgraphs:

<img width="3499" height="1178" alt="loom-iso-example" src="https://github.com/user-attachments/assets/0e038eb3-9d4b-4f9d-9c71-0988e517f028" />

The basic nodes are:
 * `Loom In` - inserts any kind of wire into the loom.
 * `Loom Out` - gets any kind of wire in the loom.
 * `Loom Join` - joins two looms, the second loom will override conflicting wires.
 * `Loom Split` - a beauty node, that allows wires to go out in multiple directions.

There are type specific nodes that prepend the type to the label to avoid name collisions, like nodes for the IMAGE type is named `Loom Image In` and `Loom Image Out`, and if a label is not provided it will automatically use "IMAGE" and if a label is provided like "image2" it will stored/retreived in the loom as "IMAGE_image2". The supported types are MODEL, CLIP, VAE, CONDITIONING, IMAGE, AUDIO, LATENT, SAMPLER, SIGMAS, NOISE.

And yes, you can have looms inside of looms! Like if you wanted a different model for upscaling, you can have it in a separate loom to avoid name collisions and then put that inside of your main loom, and pull it out when your sampler wants to upscale.

## Simple Tutorial

I recommend starting off by placing `Loom Split` nodes and linking them together (tip: holding alt-key and click dragging automatically clones a node):

<img width="774" height="395" alt="tutorial-1" src="https://github.com/user-attachments/assets/0f9fe83c-83d2-45fd-9d3b-d6f46b9fd569" />

And then collapse the `Loom Split` nodes by hitting their upper-left arrows, and adjusting them to create straight lines (tip: enabling snap mode makes that easier):

<img width="682" height="439" alt="tutorial-2" src="https://github.com/user-attachments/assets/5c105816-d55a-4cd4-8f56-2f6fa6482fb2" />

Now you can drag node input and output slots onto the loom and it will automatically create an appropriate loom nodes collapsed. For example `Load Image` and `Preview Image` can be attached and you can run them and they should just work.

<img width="725" height="446" alt="tutorial-3" src="https://github.com/user-attachments/assets/9557a4cb-1fc5-4f36-876d-8e155fae2eb0" />

This will work for MODEL, CLIP, VAE, CONDITIONING, IMAGE, AUDIO, LATENT, SAMPLER, SIGMAS, NOISE, for other kinds of slots and widgets it defaults to a generic loom node requiring labels.

If you needed to add a second image, you would need to uncollapse the nodes and change their labels:

<img width="842" height="421" alt="tutorial-4" src="https://github.com/user-attachments/assets/6d2c96ff-ad5d-448c-adba-558f24fde28d" />

In regard to labels, if you rename the widgets (a right click menu option) of primtive nodes `Int`, `Float`, or `Text String (Multiline)`, it will automatically take the widget name as the label when first attaching their output to the loom (note: it doesn't update after it's been attached). So for example renaming a `Float` nodes widget to `cfg` by right clicking it:

<img width="604" height="165" alt="tutorial-5" src="https://github.com/user-attachments/assets/15360d8a-8d3f-440b-ba94-55a74501a205" />

Attaching the `Float` node output would then automatically use the widgets new name as it's label when first created. Also nodes with widgets, like `CFG Guider` for example, will automatically take the widget label when connected to the loom:

<img width="833" height="255" alt="tutorial-6" src="https://github.com/user-attachments/assets/28f2511e-f892-4506-a1b0-40ce607ee555" />

## Gallery and Demos
### LongCat Edit Demo
[loom_longcat.json](demos/loom_longcat.json) workflow.

LongCat Edit demo, is an example of how to build a combo box for selecting models and a simple prompt replacer.

<img width="1644" height="764" alt="loom-longcat" src="https://github.com/user-attachments/assets/049d87ca-867d-4e99-830f-d5161eef0420" />

A closer look at the LongCat Edit demo's model subgraph combo box setup:

<img width="3459" height="1591" alt="loom-longcat-model" src="https://github.com/user-attachments/assets/f02b242d-e7d1-4844-9921-ecbe703f6efe" />

### Qwen Edit 2511 Demo
[loom_qwen_edit_2511.json](demos/loom_qwen_edit_2511.json) workflow.

Qwen Edit 2511 demo, is a more complex example of subgraphs that modifying looms in a stream of edits.

<img width="3658" height="1878" alt="loom-qwen_edit_2511" src="https://github.com/user-attachments/assets/8456f76a-5d93-4927-b097-33e16e46ded4" />

### Lens Demo
[loom_lens.json](demos/loom_lens.json) workflow.
Lens Example, that allows you to select turbo with a boolean widget.

<img width="795" height="683" alt="loom-lens" src="https://github.com/user-attachments/assets/f00ec8fc-8543-4ee1-911f-e928885bb8d8" />

Subgraph of the prompt:

<img width="720" height="913" alt="lens-prompt" src="https://github.com/user-attachments/assets/f06d7faf-cb75-4325-9dab-194e8b0e2e72" />

Subgraph of the model:

<img width="1433" height="813" alt="lens-model" src="https://github.com/user-attachments/assets/9ebd70a8-31f5-4cad-82f0-d0c7fb0612ea" />

Subgraph of the sampler:
<img width="1271" height="403" alt="lens-sampler-subgraph" src="https://github.com/user-attachments/assets/50730666-e2e3-41e0-b4d0-32f649f48a8c" />
