<?php
global $conn;
include_once __DIR__ . '/../database/session.php';
include '../database/pdo.php';

if (($_SESSION["ambar"] ?? null) != "connected")
{
    header("Location: ../signIn/signIn.php?status=needCredentials");
    die;
}

// Get the last visit timestamp before updating it
try {
    $getLastVisitQuery = "SELECT last_visit FROM admin_last_visit WHERE section = 'newsletter'";
    $stmtLastVisit = $conn->prepare($getLastVisitQuery);
    $stmtLastVisit->execute();
    $lastVisit = null;

    if ($stmtLastVisit->rowCount() > 0) {
        $lastVisit = $stmtLastVisit->fetch(PDO::FETCH_ASSOC)['last_visit'];
    }

    // Get new subscribers since last visit
    $newSubscribers = [];
    if ($lastVisit) {
        $newSubscribersQuery = "SELECT id, email, subscriptionDate, active FROM newsletterEmailList 
                               WHERE subscriptionDate > :lastVisit 
                               ORDER BY subscriptionDate DESC";
        $stmtNewSubscribers = $conn->prepare($newSubscribersQuery);
        $stmtNewSubscribers->bindParam(':lastVisit', $lastVisit, PDO::PARAM_STR);
        $stmtNewSubscribers->execute();
        $newSubscribers = $stmtNewSubscribers->fetchAll(PDO::FETCH_ASSOC);
    }

    // Update the last visit timestamp
    $updateQuery = "INSERT INTO admin_last_visit (section, last_visit) VALUES ('newsletter', CURRENT_TIMESTAMP) 
                   ON DUPLICATE KEY UPDATE last_visit = CURRENT_TIMESTAMP";
    $conn->exec($updateQuery);

} catch (PDOException $e) {
    // Silently fail
    $newSubscribers = [];
}

// Count the new subscribers
$newSubscribersCount = count($newSubscribers);
?>
<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <?php $ambPageTitle = 'Newsletter Administration'; include __DIR__ . '/adminHead.php'; ?>
</head>
<body class="page-newsletter">
<?php $ambAdminPage = 'newsletter'; include __DIR__ . '/adminNav.php'; ?>

<div class="admin-layout">
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="admin-title">Newsletter Admin</div>

        <div class="sidebar-actions">
            <button id="exportEmailList" class="btn btn-light w-100 mb-2">
                <i class="fas fa-copy"></i> Export Email List
            </button>
            <button id="exportCSV" class="btn btn-outline-light w-100 mb-4">
                <i class="fas fa-file-export"></i> Export to CSV
            </button>
        </div>

        <div class="section-title">Statistics</div>
        <div class="stats-list">
            <div class="stats-card">
                <i class="fas fa-users"></i>
                <div>
                    <small>Total Subscribers</small>
                    <p class="count" id="totalSubscribers">0</p>
                </div>
            </div>
            <div class="stats-card">
                <i class="fas fa-check-circle"></i>
                <div>
                    <small>Active</small>
                    <p class="count" id="activeSubscribers">0</p>
                </div>
            </div>
            <div class="stats-card">
                <i class="fas fa-pause-circle"></i>
                <div>
                    <small>Inactive</small>
                    <p class="count" id="inactiveSubscribers">0</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="content-area">
        <div class="main-content">
            <div class="page-title-row">
                <h1 class="h3">Newsletter Administration</h1>
            </div>

            <!-- New Subscribers Section -->
            <?php if ($newSubscribersCount > 0): ?>
                <div class="new-subscribers-container mb-4">
                    <div class="new-subscribers-header">
                        <div class="pulse-icon">
                            <i class="fas fa-bell"></i>
                        </div>
                        <h2>New Subscribers Since Your Last Visit</h2>
                        <span class="badge rounded-pill bg-primary"><?php echo $newSubscribersCount; ?></span>
                    </div>

                    <div class="new-subscribers-grid">
                        <?php foreach ($newSubscribers as $subscriber): ?>
                            <div class="new-subscriber-card" data-id="<?php echo $subscriber['id']; ?>">
                                <div class="email-icon">
                                    <i class="fas fa-envelope"></i>
                                </div>
                                <div class="subscriber-details">
                                    <div class="subscriber-email"><?php echo htmlspecialchars($subscriber['email']); ?></div>
                                    <div class="subscriber-time">
                                        <i class="fas fa-clock"></i>
                                        <?php echo date('M j, Y g:i A', strtotime($subscriber['subscriptionDate'])); ?>
                                    </div>
                                    <div class="subscriber-status">
                                        <?php if ($subscriber['active']): ?>
                                            <span class="status-active"><i class="fas fa-check-circle"></i> Active</span>
                                        <?php else: ?>
                                            <span class="status-inactive"><i class="fas fa-times-circle"></i> Inactive</span>
                                        <?php endif; ?>
                                    </div>
                                </div>
                                <div class="subscriber-actions">
                                    <button class="btn btn-sm btn-info edit-subscriber" data-id="<?php echo $subscriber['id']; ?>"
                                            data-email="<?php echo htmlspecialchars($subscriber['email']); ?>"
                                            data-active="<?php echo $subscriber['active']; ?>" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger delete-subscriber" data-id="<?php echo $subscriber['id']; ?>"
                                            data-email="<?php echo htmlspecialchars($subscriber['email']); ?>" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endif; ?>

            <!-- Search and Filter Controls -->
            <div class="row">
                <div class="col-md-6 mb-3">
                    <div class="input-group">
                        <span class="input-group-text"><i class="fas fa-search"></i></span>
                        <input type="text" id="searchInput" class="form-control" placeholder="Search emails..." aria-label="Search emails">
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <select id="statusFilter" class="form-select" aria-label="Which subscribers">
                        <option value="all">All Subscribers</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                        <?php if ($newSubscribersCount > 0): ?>
                            <option value="new">New Subscribers</option>
                        <?php endif; ?>
                    </select>
                </div>
                <div class="col-md-3 mb-3">
                    <select id="sortFilter" class="form-select" aria-label="Sort by">
                        <option value="email_asc">Email (A-Z)</option>
                        <option value="email_desc">Email (Z-A)</option>
                        <option value="date_desc">Newest First</option>
                        <option value="date_asc">Oldest First</option>
                    </select>
                </div>
            </div>

            <!-- Subscribers Table -->
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">Email Address</th>
                        <th scope="col">Subscription Date</th>
                        <th scope="col">Status</th>
                        <th scope="col">Actions</th>
                    </tr>
                    </thead>
                    <tbody id="subscribersList">
                    <!-- Table rows will be populated by JavaScript -->
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <nav aria-label="Subscription pagination">
                <ul id="pagination" class="pagination justify-content-center mb-0">
                    <!-- Pagination will be populated by JavaScript -->
                </ul>
            </nav>
        </div>
    </div>
</div>

<!-- Edit Subscriber Modal -->
<div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="editModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="editModalLabel">Edit Subscriber</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editForm">
                    <input type="hidden" id="editId">
                    <div class="mb-3">
                        <label for="editEmail">Email Address</label>
                        <input type="email" class="form-control" id="editEmail" required>
                    </div>
                    <div class="mb-3">
                        <div class="form-check form-switch">
                            <input type="checkbox" class="form-check-input" id="editActive">
                            <label class="form-check-label" for="editActive">Active</label>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="saveEdit">Save Changes</button>
            </div>
        </div>
    </div>
</div>

<!-- Delete Confirmation Modal -->
<div class="modal fade" id="deleteModal" tabindex="-1" role="dialog" aria-labelledby="deleteModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="deleteModalLabel">Confirm Deletion</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete this subscription?</p>
                <p><strong id="deleteEmailText"></strong></p>
                <input type="hidden" id="deleteId">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmDelete">Delete</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="emailListModal" tabindex="-1" role="dialog" aria-labelledby="emailListModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="emailListModalLabel">Copy-Paste Email List</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>Below is a comma-separated list of all subscriber emails. Click "Copy to Clipboard" to copy this list.</p>
                <div class="mb-3">
                    <textarea id="emailListText" class="form-control" rows="8" readonly></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" id="copyToClipboard">
                    <i class="fas fa-clipboard"></i> Copy to Clipboard
                </button>
                <button type="button" class="btn btn-success" id="downloadEmailList">
                    <i class="fas fa-download"></i> Download as Text File
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Welcome Back Modal for New Subscriptions -->
<?php if ($newSubscribersCount > 0): ?>
    <div class="modal fade" id="welcomeBackModal" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Welcome Back!</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center">
                    <div class="welcome-icon mb-3">
                        <i class="fas fa-envelope-open-text"></i>
                    </div>
                    <h4>You have <?php echo $newSubscribersCount; ?> new subscriber<?php echo $newSubscribersCount > 1 ? 's' : ''; ?>!</h4>
                    <p class="text-muted">New sign-ups since your last visit on <?php echo date('F j, Y \a\t g:i A', strtotime($lastVisit)); ?></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">View New Subscribers</button>
                </div>
            </div>
        </div>
    </div>
<?php endif; ?>

<!-- Toast Container for Notifications -->
<div id="toastContainer"></div>

<script>
    // Subscribers who joined since the last visit; newsletterAdmin.js marks
    // them and offers the "New Subscribers" filter
    const newSubscriberIds = <?php echo json_encode(array_map('intval', array_column($newSubscribers, 'id'))); ?>;

    $(document).ready(function() {
        // Edit/delete buttons on the new-subscriber cards in the welcome window
        $('.edit-subscriber').on('click', function() {
            $('#welcomeBackModal').modal('hide');
            openEditModal($(this).data('id'));
        });

        $('.delete-subscriber').on('click', function() {
            $('#welcomeBackModal').modal('hide');
            openDeleteModal($(this).data('id'));
        });
    });
</script>

<script src="../js/newsletterAdmin.js?v=<?php echo filemtime(__DIR__ . '/../js/newsletterAdmin.js'); ?>"></script>
</body>
</html>