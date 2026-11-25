<?php
// The order of works inside a project.
//
// Each project keeps its own order in worksInProjects.sortOrder, a column
// added by database/projectWorkOrder.sql. Until that has been run on a
// database, everything here falls back to the old order: each painting's own
// orderOfDisplay, which is shared by every project the painting is in.
//
// A link with no sortOrder yet (a project never arranged, or a work added
// to an arranged project from the painting's own editor) comes after the
// arranged ones, in the old order.

function ambProjectOrderReady($conn)
{
    static $ready = null;
    if ($ready === null) {
        try {
            $ready = (bool) $conn->query("SHOW COLUMNS FROM worksInProjects LIKE 'sortOrder'")->fetch();
        } catch (Throwable $e) {
            $ready = false;
        }
    }
    return $ready;
}

// The ORDER BY for works in a project, with worksInProjects as wip and
// allWorks as w
function ambProjectWorksOrderBy($conn)
{
    return ambProjectOrderReady($conn)
        ? 'wip.sortOrder IS NULL, wip.sortOrder ASC, w.orderOfDisplay DESC, wip.id ASC'
        : 'w.orderOfDisplay DESC, wip.id ASC';
}
