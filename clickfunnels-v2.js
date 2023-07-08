console.log("ClickFunnels v2.0 Extension Loaded");

const app = {
  tasks: [],

  pages: [
    {
      pattern: "https://.*\\.myclickfunnels\\.com/account/sites/.*/courses",
      action: () => {
        app.addMembershipSelect();
      },
    },
    {
      pattern: "https://.*\\.myclickfunnels\\.com/account/courses/.*",
      action: () => {
        if (app.tasks.length > 0) {
          app.determineNextTask();
        }
      },
    },
  ],

  init: () => {
    const href = window.location.href;

    for (let page of app.pages) {
      if (new RegExp(page.pattern).test(href)) {
        page.action();
        break;
      }
    }
  },

  determineNextTask: () => {
    const nextTask = app.tasks.find((task) => !task.completed);

    if (nextTask) {
      switch (nextTask.action) {
        case "create_course":
          app.createCourse(nextTask);
          break;
        case "create_section":
          app.createSection(nextTask);
          break;
        case "create_lesson":
          app.createLesson(nextTask);
          break;
      }
    } else {
      console.log("No tasks to complete. All done.");
    }
  },

  buildTasks: async () => {
    const index = document.querySelector("#cfc_import_select").value;
    const data = await cf_global.getLocalStorage("cfc_memberships");
    const membership = data[index];

    if (index && membership) {
      app.tasks.push({
        completed: false,
        action: "create_course",
        data: {
          name: membership.name,
        },
      });

      membership.sections.forEach((section) => {
        app.tasks.push({
          completed: false,
          action: "create_section",
          data: {
            name: section.name,
          },
        });
      });

      membership.sections.forEach((section, index) => {
        section.lessons.forEach((lesson) => {
          app.tasks.push({
            completed: false,
            action: "create_lesson",
            data: {
              name: lesson.name,
              section_index: index,
            },
          });
        });
      });

      // todo: add lesson html tasks
      // todo: handle drip days
      // todo: publish each section and lesson

      app.determineNextTask();
    } else {
      alert("No membership selected.");
    }
  },

  pollForElement: (selector, callback) => {
    const poll = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(poll);
        callback(element);
      }
    }, 250);
  },

  addMembershipSelect: async () => {
    const domWrapper = document.querySelector(
      "#main_content > div.flex > div.flex-1.flex.flex-col.focus\\:outline-none.rounded-tl-none.max-w-full > main > div > div.bg-gray-50.bg-opacity-50.rounded-tl-xl.min-h-screen.transition-translate.ease-in-out.duration-150.ml-50.sm\\:w-auto > div > section > div:nth-child(1) > header > div.flex.space-x-3.ml-auto"
    );

    if (domWrapper) {
      const div = document.createElement("div");
      div.classList.add("flex", "items-center");

      const button = document.createElement("button");
      button.innerText = "Import";
      button.classList.add("button", "ml-2");
      button.addEventListener("click", app.buildTasks);

      const data = await cf_global.getLocalStorage("cfc_memberships");
      const options = data.map((section, index) => {
        return `<option value="${index}">${section.name}</option>`;
      });
      const select = document.createElement("select");
      select.id = "cfc_import_select";
      select.classList.add("input", "input--search");
      select.style.width = "200px";
      select.style.paddingLeft = "15px";
      select.style.marginLeft = "10px";
      select.innerHTML = `
        <option value="null">Select a membership</option>
        ${options}
      `;
      div.appendChild(select);
      div.appendChild(button);
      domWrapper.appendChild(div);
    }
  },

  createCourse: (nextTask) => {
    const courseButton = document.querySelector(
      "#main_content > div.flex > div.flex-1.flex.flex-col.focus\\:outline-none.rounded-tl-none.max-w-full > main > div > div.bg-gray-50.bg-opacity-50.rounded-tl-xl.min-h-screen.transition-translate.ease-in-out.duration-150.ml-50.sm\\:w-auto > div > section > div:nth-child(1) > header > div.flex.space-x-3.ml-auto > a"
    );
    courseButton.click();

    app.pollForElement(
      "#index_search > div > div > div:nth-child(1) > div > div > a",
      (blankCourse) => {
        const buttonHref = blankCourse.getAttribute("href");
        blankCourse.setAttribute(
          "href",
          buttonHref.replace("Blank Course", nextTask.data.name)
        );
        blankCourse.click();
        app.pollForElement("turbo-frame#dialog", () => {
          app.pollForElement("sl-dialog", () => {
            const dom = document.querySelector("turbo-frame#dialog");
            const slDialog = dom.querySelector("sl-dialog");
            const shadowRoot = slDialog.shadowRoot;

            const nestedComponent = shadowRoot
              .querySelector(".dialog__body")
              .assignedElements()[0];

            nestedComponent.querySelector("input[type='submit']").click();
            nextTask.completed = true;
          });
        });
      }
    );
  },

  createSection: (nextTask) => {
    let addButton = document.querySelector(
      "#modules > div > div > div > div > div > div > div > div > a"
    );
    if (!addButton) {
      addButton = document.querySelector(
        "#course_18903_section_tree > div.flex.items-center.flex-wrap.justify-between.pb-5 > div.ml-auto.flex-grow-0.flex-shrink-0.text-right.lead-none.whitespace-nowrap.flex.items-center > a"
      );
    }
    if (addButton) {
      addButton.click();
      app.pollForElement("#courses\\/section_title", (input) => {
        input.value = nextTask.data.name;
        document
          .querySelector(
            "#new_courses_section_form > form > div > footer > div > input"
          )
          .click();
      });
    }

    nextTask.completed = true;
  },

  createLesson: (nextTask) => {
    const sectionDom = document.querySelectorAll(
      '.course-menu-item[data-controller="accordion"]'
    );
    const allSections = [];
    sectionDom.forEach((section) => {
      if (section.id.includes("section")) {
        allSections.push(section);
      }
    });
    const section = allSections[nextTask.data.section_index];

    const addLessonButton = section.querySelector("#menu-button");
    addLessonButton.click();

    app.pollForElement(
      `.course-menu-item[data-controller="accordion"]:nth-child(${
        nextTask.data.section_index + 1
      }) a[data-testid='add-lesson']`,
      (button) => {
        button.click();

        app.pollForElement("#courses\\/lesson_title", (input) => {
          let lessonName = nextTask.data.name;
          lessonName = lessonName.replace(/Lesson #\d+: /, "");
          input.value = lessonName;
          const event = new Event("input", {
            bubbles: true,
            cancelable: true,
          });
          input.dispatchEvent(event);
          document
            .querySelector(
              "#new_courses_lesson_form > form > section > div:nth-child(2) > footer > div > div > div:nth-child(2) > div > input"
            )
            .click();
        });
      }
    );

    nextTask.completed = true;
  },
};

app.init();

document.addEventListener("turbo:load", async function () {
  setTimeout(() => {
    app.init();
  }, 750);
});
