import { GridRowId, GridRowTreeConfig } from '@mui/x-data-grid';
export declare function skipFiltering(rowTree: GridRowTreeConfig): {
    filteredRowsLookup: Record<GridRowId, boolean>;
    filteredChildrenCountLookup: Record<GridRowId, number>;
    filteredDescendantCountLookup: Record<GridRowId, number>;
};
export declare function skipSorting(rowTree: GridRowTreeConfig): GridRowId[];
