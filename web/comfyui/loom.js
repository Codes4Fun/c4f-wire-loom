import { app } from "../../scripts/app.js";

let loom_lineWidth = 11;
let loom_dirFromInput = true;

// MARK: Types

const loom_typeNames = new Set([
 'LoomInNode',
 'LoomJoinNode',
 'LoomSplitNode',
 'LoomOutNode'
]);

const loom_subTypeNames = [
 'Model',
 'Clip',
 'VAE',
 'Conditioning',
 'Image',
 'Audio',
 'Latent',
 'Sampler',
 'Sigmas',
 'Noise'
];

for (const subTypeName of loom_subTypeNames ) {
    loom_typeNames.add(`LoomIn${subTypeName}Node`);
    loom_typeNames.add(`LoomOut${subTypeName}Node`);
}

function isLoomNodeName(name) {
    if (!name.startsWith('Loom'))
        return false;
    return loom_typeNames.has(name);
}

function isLoomNode(node) {
    return isLoomNodeName(node.type);
}

// MARK: Calculations

function getOppositeDirection( dir ) {
    switch (dir) {
    case LiteGraph.UP:    return LiteGraph.DOWN;
    case LiteGraph.DOWN:  return LiteGraph.UP;
    case LiteGraph.LEFT:  return LiteGraph.RIGHT;
    case LiteGraph.RIGHT: return LiteGraph.LEFT;
    }
    return dir;
}

function isDirectionHorizontal( dir ) {
    switch (dir) {
    case LiteGraph.LEFT:
    case LiteGraph.RIGHT:
        return true;
    }
    return false;
}

function isDirectionVertical( dir ) {
    switch (dir) {
    case LiteGraph.UP:
    case LiteGraph.DOWN:
        return true;
    }
    return false;
}

function getLinkOtherNode(node, slot, isInput) {
    // Get the link connected to this slot
    const linkId = isInput? slot?.link : slot?.links?.[0];

    if (linkId == null || linkId === -1) // No connection - default direction
        return null;

    const link = node.graph?.links?.[linkId];
    if (!link)
        return null;

    // Get the connected node
    const connectedNodeId = isInput ? link.origin_id : link.target_id;
    const connectedNode = node.graph.getNodeById(connectedNodeId);
    return connectedNode;
}

function getLinkDelta(node, connectedNode, isInput) {
    // Calculate relative position from this node to connected node
    let dx = connectedNode.pos[0] - node.pos[0];
    let dy = connectedNode.pos[1] - node.pos[1];
    if (isInput) {
        if (!connectedNode.flags?.collapsed) {
            dx += connectedNode.size[0];
        } else {
            dx += connectedNode._collapsed_width || LiteGraph.NODE_TITLE_HEIGHT;
        }
    }
    return [dx, dy];
}

function getLinkAngle(node, otherNode, isInput) {
    const [dx, dy] = getLinkDelta(node, otherNode, isInput);
    // Use atan2 to get angle, then map to cardinal direction
    const angle = Math.atan2(dy, dx);
    return angle;
}

function getLinkDirection(node, slot, isInput) {
    const otherNode = getLinkOtherNode(node, slot, isInput);
    if (!otherNode)
        return null;

    const angle = getLinkAngle(node, otherNode, isInput);
    if (angle == null)
        return null;

    // Map angle to direction (pointing toward connected node)
    if (angle >= -Math.PI/4 && angle < Math.PI/4) { // -45 <= angle < 45
        return LiteGraph.RIGHT;
    } else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) { // 45 <= angle < 135
        return LiteGraph.DOWN;
    } else if (angle >= 3*Math.PI/4 || angle < -3*Math.PI/4) {
        return LiteGraph.LEFT;
    } else {
        return LiteGraph.UP;
    }
}

function getLinkHorizontalDirection(node, slot, isInput) {
    const otherNode = getLinkOtherNode(node, slot, isInput);
    if (!otherNode)
        return null;

    const [dx, dy] = getLinkDelta(node, otherNode, isInput);
    if (dx < 0)
        return LiteGraph.LEFT;
    return LiteGraph.RIGHT;
}

function getLinkVerticalDirection(node, slot, isInput) {
    const otherNode = getLinkOtherNode(node, slot, isInput);
    if (!otherNode)
        return null;

    const [dx, dy] = getLinkDelta(node, otherNode, isInput);
    if (dy < 0)
        return LiteGraph.UP;
    return LiteGraph.DOWN;
}

function updateSlotDirs( node ) {
    if ( node.flags?.collapsed ) {
        if (loom_dirFromInput
         && node.type != 'LoomJoinNode'
         && node.type != 'LoomSplitNode'
         && node.inputs[0].link != null
         && node.outputs[0].links?.length
        ) {
            const inputDir = getLinkDirection( node, node.inputs[0], true );
            node.inputs[0].dir = inputDir;
            node.outputs[0].dir = getOppositeDirection( inputDir );
            if (isDirectionVertical(inputDir))
            {
                for (let i = 1; i < node.inputs.length; i++) {
                    const slot = node.inputs[i];
                    const dir = getLinkHorizontalDirection(node, slot, true);
                    slot.dir = dir;
                }
                for (let i = 1; i < node.outputs.length; i++) {
                    const slot = node.outputs[i];
                    const dir = getLinkHorizontalDirection(node, slot, false);
                    slot.dir = dir;
                }
            }
            else
            {
                for (let i = 1; i < node.inputs.length; i++) {
                    const slot = node.inputs[i];
                    const dir = getLinkVerticalDirection(node, slot, true);
                    slot.dir = dir;
                }
                for (let i = 1; i < node.outputs.length; i++) {
                    const slot = node.outputs[i];
                    const dir = getLinkVerticalDirection(node, slot, false);
                    slot.dir = dir;
                }
            }
            return;
        }
        for (const slot of node._concreteInputs) {
            const dir = getLinkDirection( node, slot, true );
            slot.dir = dir;
        }
        for (const slot of node._concreteOutputs) {
            const dir = getLinkDirection( node, slot, false );
            slot.dir = dir;
        }
        return;
    }
    for (const slot of node._concreteInputs) {
        slot.dir = null;
    }
    for (const slot of node._concreteOutputs) {
        slot.dir = null;
    }
}

function getCollapsedSlotRelPos( slot, isInput ) {
    const dir = slot.dir || (isInput? LiteGraph.LEFT : LiteGraph.RIGHT)
    const width = LiteGraph.vueNodesMode? 38 : LiteGraph.NODE_TITLE_HEIGHT;
    const half = width * 0.5;
    switch (dir) {
    case LiteGraph.UP:    return [  half, -width ];
    case LiteGraph.DOWN:  return [  half,      0 ];
    case LiteGraph.LEFT:  return [     0,  -half ];
    case LiteGraph.RIGHT: return [ width,  -half ];
    }
    return [half, -half];
}

function getCollapsedSlotPos( nodePos, slot, isInput ) {
    let pos = getCollapsedSlotRelPos( slot, isInput );
    if (LiteGraph.vueNodesMode)
        pos[1] += 8;
    pos[0] += nodePos[0];
    pos[1] += nodePos[1];
    return pos;
}

// MARK: VUE Styling

function addNewElementListener(root, handlers, index=0) {
    function handleNewElement(node, curIndex) {
        if (!handlers[curIndex](node))
            return;

        const nextIndex = curIndex + 1;
        if (nextIndex >= handlers.length)
            return;

        addNewElementListener(node, handlers, nextIndex);

        // handle children in hierarchy
        let child = node.firstElementChild;
        while (child) {
            handleNewElement(child, nextIndex);
            child = child.nextElementSibling;
        }
    }

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            // Check if nodes were added
            if (mutation.type !== 'childList' || mutation.addedNodes.length < 1)
                return;

            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== Node.ELEMENT_NODE)
                    return;

                handleNewElement(node, index);
            });
        });
    });
    
    observer.observe(root, { childList: true, subtree: false });
}

function markLoomNode(node) {
    if (!node.hasAttribute('data-node-id'))
        return;

    const id = parseInt(node.getAttribute('data-node-id'));
    const cuiNode = app.canvas.graph.getNodeById(id);
    if (!cuiNode)
        return;

    if (!isLoomNode(cuiNode))
        return;

    node.setAttribute('data-loom', 'true');
}

function setupLoomNodeStyler() {
    const gcc = document.querySelector('#graph-canvas-container');
    if (!gcc) {
        console.log('failed to find graph-canvas-container');
        return;
    }

    addNewElementListener(gcc, [
        (node) => node.getAttribute('data-testid') == 'transform-pane',
        markLoomNode
    ]);
}

// MARK: Register

app.registerExtension({
    name: "c4f.Loom",

    async init() {
        const super_dropOnNothing = app.canvas.linkConnector.constructor.prototype.dropOnNothing;
        app.canvas.linkConnector.constructor.prototype.dropOnNothing = function (event) {
            const { canvasX, canvasY } = event;

            const canvas = app.canvas;
            const { lineWidth } = canvas.ctx;
            canvas.ctx.lineWidth = loom_lineWidth;
            const dpi = Math.max(window?.devicePixelRatio ?? 1, 1);

            for (const linkSegment of canvas.renderedPaths) {
                if (linkSegment.type != 'LOOM') continue;

                const centre = linkSegment._pos
                if (!centre) continue;

                let isLinkHit = canvas.ctx.isPointInStroke(
                    linkSegment.path,
                    canvasX * dpi,
                    canvasY * dpi
                );

                if (!isLinkHit) continue;

                const graph = this.renderLinks[0].node.graph;

                const link = linkSegment;

                const originNode = graph.getNodeById(link.origin_id);
                const originSlot = link.origin_slot;
                const originDir = originNode?
                    originNode.outputs[originSlot].dir
                    : graph.inputNode.slots[originSlot].dir;

                const targetNode = graph.getNodeById(link.target_id);
                const targetSlot = link.target_slot;
                const targetDir = targetNode?
                    targetNode.inputs[targetSlot].dir
                    : graph.outputNode.slots[targetSlot].dir;
                
                const half = LiteGraph.NODE_TITLE_HEIGHT * 0.5;
                let name = this.state.connectingTo === "output"?
                    "LoomOut" :
                    "LoomIn";
                let any = false;
                switch(this.renderLinks[0].fromSlot.type) {
                case 'MODEL': name += "ModelNode"; break;
                case 'CLIP': name += "ClipNode"; break;
                case 'VAE': name += "VAENode"; break;
                case 'CONDITIONING': name += "ConditioningNode"; break;
                case 'IMAGE': name += "ImageNode"; break;
                case 'AUDIO': name += "AudioNode"; break;
                case 'LATENT': name += "LatentNode"; break;
                case 'SAMPLER': name += "SamplerNode"; break;
                case 'SIGMAS': name += "SigmasNode"; break;
                case 'NOISE': name += "NoiseNode"; break;
                default:
                    name += "Node";
                    any = true;
                    break;
                }
                const newNode = LiteGraph.createNode(name);
                newNode.pos = [canvasX - half, canvasY + half];
                newNode.flags.collapsed = true;
                graph.add(newNode);
                if (this.state.connectingTo === "output") {
                    const slot = newNode.outputs[1];
                    this._dropOnOutput(newNode, slot);
                    slot.dir = getLinkDirection( newNode, slot, false );
                    if (any) {
                        // LoomOut -> nodeIn
                        const dropLink = graph.getLink(slot.links[0]);
                        const dropFromNode = graph.getNodeById(dropLink.target_id);
                        if (dropFromNode) {
                            const dropFromSlot = dropFromNode.inputs[dropLink.target_slot]
                            if (dropFromSlot.name)
                                newNode.widgets[0].value = dropFromSlot.name;
                        }
                    }
                } else if (this.state.connectingTo === "input") {
                    // nodeOut -> LoomIn
                    const slot = newNode.inputs[1];
                    this._dropOnInput(newNode, slot);
                    slot.dir = getLinkDirection( newNode, slot, true );
                    if (any) {
                        const dropLink = graph.getLink(slot.link);
                        const dropFromNode = graph.getNodeById(dropLink.origin_id);
                        if (dropFromNode?.type == 'PrimitiveFloat'
                            || dropFromNode?.type == 'PrimitiveInt') {
                            const label = dropFromNode.widgets[0]._state.label;
                            if (label)
                                newNode.widgets[0].value = label;
                        }
                    }
                }

                // changes links
                graph.removeLink(link.id);
                if (originNode)
                    originNode.connect(originSlot, newNode, 0);
                else {
                    const newNodeSlot = newNode.inputs[0];
                    graph.inputs[originSlot].connect(newNodeSlot, newNode);
                }
                if (targetNode)
                    newNode.connect(0, targetNode, targetSlot);
                else {
                    const newNodeSlot = newNode.outputs[0];
                    graph.outputs[targetSlot].connect(newNodeSlot, newNode);
                }

                // set slot directions
                if (originNode)
                    originNode.outputs[originSlot].dir = originDir;
                else
                    graph.inputNode.slots[originSlot].dir = LiteGraph.RIGHT;
                newNode.outputs[0].dir = originDir;
                newNode.inputs[0].dir = targetDir;
                if (targetNode)
                    targetNode.inputs[targetSlot].dir = targetDir;
                else
                    graph.outputNode.slots[targetSlot].dir = LiteGraph.LEFT;

                //if (originNode) originNode.setDirtyCanvas(true, true);
                //targetNode.setDirtyCanvas(true, true);
                //graph.change();

                // Restore line width
                canvas.ctx.lineWidth = lineWidth
                return;
            }

            // Restore line width
            canvas.ctx.lineWidth = lineWidth

            super_dropOnNothing.apply( this, [event] );
        }

        // Register the link type color
        //LGraphCanvas.link_type_colors["LOOM"] = "#222222"
        //LGraphCanvas.link_type_colors["LOOM"] = "#2a2a2a";
    },

    async setup() {
        const super_renderAllLinkSegments = LGraphCanvas.prototype._renderAllLinkSegments;
        LGraphCanvas.prototype._renderAllLinkSegments = function (
            ctx, link, startPos, endPos, visibleReroutes, now,
            startDirection, endDirection, disabled
        ) {
            const orgLineWidth = this.connections_width;
            if (link.type == 'LOOM') {
                this.connections_width = loom_lineWidth;
            }

            // MARK: VUE Link Pos
            const originNode = app.canvas.graph.getNodeById(link.origin_id);
            if (originNode && isLoomNode(originNode) && originNode.flags?.collapsed) {
                startPos = originNode.getOutputPos(link.origin_slot);
            }
            const targetNode = app.canvas.graph.getNodeById(link.target_id);
            if (targetNode && isLoomNode(targetNode) && targetNode.flags?.collapsed) {
                endPos = targetNode.getInputPos(link.target_slot);
            }

            super_renderAllLinkSegments.apply( this, [
                ctx, link, startPos, endPos, visibleReroutes, now,
                startDirection, endDirection, disabled
            ]);
            this.connections_width = orgLineWidth;
        }

        setupLoomNodeStyler();
    },

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (!isLoomNodeName(nodeData.name))
            return;
        //console.log('LOOM.beforeReg: "'+nodeData.name+'"');

        /*
        const super_collapse = nodeType.prototype.collapse;
        nodeType.prototype.collapse = function(force) {
            super_collapse.apply(this, [force]);
            updateSlotDirs( this );
        }*/

        const super_measure = nodeType.prototype.measure;
        nodeType.prototype.measure = function(out, ctx) {
            super_measure.apply(this, [out, ctx]);
            if (this.flags?.collapsed) {
                if (!LiteGraph.vueNodesMode)
                    this._collapsed_width = LiteGraph.NODE_TITLE_HEIGHT;
                out[2] = LiteGraph.NODE_TITLE_HEIGHT;
            }
            updateSlotDirs( this );
        };

        const super_drawTitleText = nodeType.prototype.drawTitleText;
        nodeType.prototype.drawTitleText = function( ctx, options ) {
            if (this.flags?.collapsed)
                return;
            super_drawTitleText.apply( this, [ctx, options] );
        };

        function drawCollapsedSlot( slot, ctx, isInput ) {
            const { fillStyle } = ctx; // save style

            const [x, y] = getCollapsedSlotRelPos( slot, isInput )
            ctx.fillStyle = slot.renderingColor( app.canvas.colourGetter );
            ctx.beginPath()
            ctx.arc(x, y, 4, 0, Math.PI * 2)
            ctx.fill()
    
            ctx.fillStyle = fillStyle; // restore style
        }

        nodeType.prototype.drawCollapsedSlots = function( ctx ) {
            // Render the first connected slot only.
            /*for (const slot of this._concreteInputs) {
                if (slot.link != null) {
                    drawCollapsedSlot( slot, ctx, true );
                    break
                }
            }
            for (const slot of this._concreteOutputs) {
                if (slot.type == "LOOM" || slot.name == "exists")
                    continue;
                if (slot.links?.length) {
                    drawCollapsedSlot( slot, ctx, false );
                    break
                }
            }*/
        }

        const super_getInputPos = nodeType.prototype.getInputPos;
        nodeType.prototype.getInputPos = function( slot ) {
            if (this.flags?.collapsed) {
                return getCollapsedSlotPos( this.pos, this.inputs[slot], true );
            }
            return super_getInputPos.apply( this, [slot] );
        };

        const super_getOutputPos = nodeType.prototype.getOutputPos;
        nodeType.prototype.getOutputPos = function( slot ) {
            if (this.flags?.collapsed) {
                return getCollapsedSlotPos( this.pos, this.outputs[slot], false );
            }
            return super_getOutputPos.apply( this, [slot] );
        };

        const super_drawBadges = nodeType.prototype.drawBadges;
        nodeType.prototype.drawBadges = function (ctx) {
            if (this.flags?.collapsed)
                return;
            super_drawBadges.apply( this, [ctx] );
        }
    },
});

function addCSS() {
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/css");
    link.href = "extensions/c4f-wire-loom/user.css";
    document.head.appendChild(link);
}
addCSS();

