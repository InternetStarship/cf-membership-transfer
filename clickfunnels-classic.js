console.log("ClickFunnels Classic Extension Loaded");

const cfClassicCheck = document.querySelector(
  `[data-confirm="Are you sure? This will delete this members area, content, and all members"]`
);

if (cfClassicCheck) {
  const app = {
    sections: [],
    exportButton: null,

    init: async () => {
      chrome.storage.local.get(["cfc_memberships"], function (result) {
        if (result.cfc_memberships) {
          console.log("cfc_memberships currently is ", result.cfc_memberships);
        }
      });
      app.addClassicButton();
    },

    build: async () => {
      app.exportButton.innerText = "Loading...";
      await app.getSections();
      let data = {
        name: document.querySelector(".funnelHeaderName").innerText.trim(),
        sections: app.sections,
      };
      const currentData = await app.getLocalStorage("cfc_memberships");
      if (currentData) {
        currentData.push(data);
        data = currentData;
      } else {
        data = [data];
      }
      chrome.storage.local.set({
        cfc_memberships: data,
      });
      console.log("CF Classic Data:", app.sections);
      app.exportButton.innerText = "Completed";
      setTimeout(() => {
        app.exportButton.innerText = "Export Membership";
      }, 4000);
    },

    addClassicButton: () => {
      const button = document.createElement("button");
      button.innerText = "Export Membership";
      button.classList.add("btn", "btn-primary", "btn-sm");
      button.addEventListener("click", app.build);
      button.style.marginLeft = "10px";
      document
        .querySelector(".footerFunnelActions .pull-left")
        .appendChild(button);
      app.exportButton = button;
    },

    createIframeAndLoad: async (base_url, id, path, type) => {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = `${base_url}/${path}/${id}/${type}`;

      const iframeLoadedPromise = new Promise((resolve) => {
        iframe.onload = () => resolve(iframe.contentDocument);
      });

      document.body.appendChild(iframe);
      const iframeDocument = await iframeLoadedPromise;
      iframe.remove();

      return iframeDocument;
    },

    getLocalStorage: (key) => {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          resolve(result[key]);
        });
      });
    },

    getSections: async () => {
      const lessonSections = document.querySelectorAll(".lessonsectionname");
      const base_url = window.location.href.split("/funnels")[0];

      app.sections = await Promise.all(
        Array.from(lessonSections).map(async (section) => {
          const lessons = [];
          const lessonItems = section
            .closest(".lesson_section")
            .querySelectorAll(".lessionItem");

          for (const lesson of lessonItems) {
            const id = lesson.id.replace("cI_", "");

            const iframeDocument1 = await app.createIframeAndLoad(
              base_url,
              id,
              "lessons",
              "edit"
            );

            const dripDelayInput =
              iframeDocument1.querySelector("#lesson_days_delay");
            const secondsCompleteTimeInput = iframeDocument1.querySelector(
              "#lesson_lesson_setting_attributes_required_time"
            );
            const releaseDateInput = iframeDocument1.querySelector(
              "#lesson_lesson_setting_attributes_release_date"
            );

            const iframeDocument2 = await app.createIframeAndLoad(
              base_url,
              id,
              "lessons",
              "editor"
            );

            const html =
              iframeDocument2.querySelector(".containerWrapper").innerHTML;

            lessons.push({
              name: lesson.querySelector(".courseItemName").innerText.trim(),
              drip_delay: dripDelayInput ? dripDelayInput.value : null,
              seconds_complete_time: secondsCompleteTimeInput
                ? secondsCompleteTimeInput.value
                : null,
              release_date: releaseDateInput ? releaseDateInput.value : null,
              // html: html,
            });
          }

          return {
            name: section.innerText.trim(),
            lessons: lessons,
          };
        })
      );
    },
  };

  app.init();
}
