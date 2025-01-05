"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.skipFiltering = skipFiltering;
exports.skipSorting = skipSorting;
var _xDataGrid = require("@mui/x-data-grid");
var _internals = require("@mui/x-data-grid/internals");
function skipFiltering(rowTree) {
  const filteredRowsLookup = {};
  const filteredChildrenCountLookup = {};
  const filteredDescendantCountLookup = {};
  const nodes = Object.values(rowTree);
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    filteredRowsLookup[node.id] = true;
    filteredChildrenCountLookup[node.id] = node.serverChildrenCount ?? 0;
  }
  return {
    filteredRowsLookup,
    filteredChildrenCountLookup,
    filteredDescendantCountLookup
  };
}
function skipSorting(rowTree) {
  return (0, _internals.getTreeNodeDescendants)(rowTree, _xDataGrid.GRID_ROOT_GROUP_ID, false);
}