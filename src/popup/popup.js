"use strict";

const TabHistory = (function () {
    const me = {};

    /**
     * Returns the historic parent of a tab.
     *
     * @name   TabHistory.getParentOfTab
     * @generator
     * @function
     * @param {Tab} tab
     * @returns {Promise}
     */
    me.getParentOfTab = async function(tab) {
        if (!tab.openerTabId) {
            return new Promise((resolve, reject) => {
                reject(new Error("no more parents found"));
            });
        }

        return await browser.tabs.get(tab.openerTabId);
    };

    /**
     * Returns the whole history of the tab.
     *
     * @name   TabHistory.getCurrentTab
     * @function
     * @returns {Object}
     */
    me.getCurrentTab = async function() {
        const currentTab = await browser.tabs.query({currentWindow: true, active: true});
        return currentTab[0];
    };

    return me;
})();

const UserInterface = (function () {
    const me = {};

    const elCurrentTab = document.getElementById("currentTab");
    const elTabTemplate = document.getElementById("tabtemplate");

    let historyCount;
    let elLastHistory;

    /**
     * Recursively goes through historic elements to add them to UI.
     *
     * @name   UserInterface.addHistoryElement
     * @function
     * @private
     * @param {Object} tab
     * @returns {void}
     */
    function addHistoryElement(tab) {
        const elTab = elTabTemplate.cloneNode(true);
        elTab.removeAttribute("id");

        // attach event listener
        elTab.addEventListener("click", tabClick);

        setTabProperties(tab, elTab);

        historyCount++;

        // save child as one for next tab
        elLastHistory = elLastHistory.appendChild(elTab);

        // get next parent
        TabHistory.getParentOfTab(tab).then(addHistoryElement);
    }

    /**
     * When one item of the tab list is clicked.
     *
     * @name   UserInterface.tabClick
     * @function
     * @private
     * @param {Event} event
     * @returns {void}
     */
    function tabClick(event) {
        const elTab = event.currentTarget;
        const tabId = Number(elTab.dataset.tabId);
        const windowId = Number(elTab.dataset.windowId);

        browser.windows.update(
            windowId, {
                focused: true
            }
        );

        browser.tabs.update(
            tabId,
            {
                active: true
            }
        ).then(() => {
            // "reload" whole UI
            Controller.run();
        });

        // only possible in Chrome currently
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1464601
        // browser.tabs.highlight({
        //     tabs: tabId
        // });
    }

    /**
     * Adds the data from the tab to the UI.
     *
     * @name   UserInterface.setTabProperties
     * @function
     * @private
     * @param {Object} tab
     * @param {HtmlElement} elGroup the place where to add the element
     * @returns {void}
     */
    function setTabProperties(tab, elGroup) {
        elGroup.getElementsByClassName("title")[0].textContent = tab.title;

        // save ID of tab
        elGroup.dataset.tabId = tab.id;
        elGroup.dataset.windowId = tab.windowId;

        const elFavicon = elGroup.querySelector("img");
        if (tab.favIconUrl) {
            elFavicon.setAttribute("src", tab.favIconUrl);
        } else {
            elFavicon.classList.add("invisible");
        }

        if (tab.hidden) {
            elGroup.classList.add("hiddenTab");
        }
        if (tab.pinned) {
            elGroup.classList.add("pinnedTab");
        }
        if (tab.incognito) {
            elGroup.classList.add("privateTab");
        }
    }

    /**
     * Destroys the current UI.
     *
     * @name   UserInterface.destroyUi
     * @function
     * @returns {void}
     */
    me.destroyUi = function() {
        historyCount = 0;
        elLastHistory = document.getElementById("tabhistory");

        const elementChild = elLastHistory.firstElementChild;
        if (elLastHistory.firstElementChild) {
            elementChild.remove();
        }
    };

    /**
     * Creates the basic UI structure.
     *
     * @name   UserInterface.buildUi
     * @function
     * @returns {void}
     */
    me.buildUi = async function() {
        const currentTab = await TabHistory.getCurrentTab();
        setTabProperties(currentTab, elCurrentTab);

        TabHistory.getParentOfTab(currentTab).then(addHistoryElement).catch(() => {
            // at the end a failure is triggered, because it cannot find more parents
            if (historyCount === 0) {
                const elNoElementFound = document.getElementById("noElementFound");
                elNoElementFound.textContent = browser.i18n.getMessage("noHistoryFound");
                elNoElementFound.classList.remove("invisible");
            }
        });
    };

    return me;
})();

const Controller = (function () {
    const me = {};

    /**
     * Run the application.
     *
     * @name   Controller.run
     * @function
     * @returns {void}
     */
    me.run = function() {
        // reset values
        UserInterface.destroyUi();
        // build UI
        UserInterface.buildUi();
    };

    return me;
})();

// init modules
Controller.run();
