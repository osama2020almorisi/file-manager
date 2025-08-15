
const uploadBtn = document.getElementById('uploadBtn');
const fileList = document.getElementById('fileList');

let octokit;

uploadBtn.addEventListener('click', async () => {
  const token = document.getElementById('token').value;
  const repo = document.getElementById('repo').value;
  const folder = document.getElementById('folder').value;
  const files = document.getElementById('files').files;

  if (!token || !repo || !folder || files.length === 0) {
    alert("يرجى ملء جميع الحقول واختيار الملفات");
    return;
  }

  octokit = new Octokit.Octokit({ auth: token });

  for (let file of files) {
    const path = `${folder}/${file.name}`;
    const content = await fileToBase64(file);

    try {
      // التأكد إذا الملف موجود لتعديل أو إنشاء
      let sha = null;
      try {
        const existing = await octokit.rest.repos.getContent({ owner: await getUser(), repo, path });
        sha = existing.data.sha;
      } catch (err) {
        // الملف غير موجود
      }

      await octokit.rest.repos.createOrUpdateFileContents({
        owner: await getUser(),
        repo,
        path,
        message: sha ? `تحديث ${file.name}` : `إضافة ${file.name}`,
        content,
        sha
      });
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء رفع الملف: " + file.name);
    }
  }

  alert("تم رفع الملفات بنجاح!");
  listFiles(repo, folder);
});

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // حذف الجزء data:*/*;base64,
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

async function getUser() {
  const user = await octokit.rest.users.getAuthenticated();
  return user.data.login;
}

async function listFiles(repo, folder) {
  fileList.innerHTML = '';
  try {
    const res = await octokit.rest.repos.getContent({
      owner: await getUser(),
      repo,
      path: folder
    });

    res.data.forEach(file => {
      const li = document.createElement('li');
      li.textContent = file.name;

      const delBtn = document.createElement('button');
      delBtn.textContent = 'حذف';
      delBtn.addEventListener('click', async () => {
        if (confirm("هل أنت متأكد من الحذف؟")) {
          await octokit.rest.repos.deleteFile({
            owner: await getUser(),
            repo,
            path: `${folder}/${file.name}`,
            message: `حذف ${file.name}`,
            sha: file.sha
          });
          listFiles(repo, folder);
        }
      });

      li.appendChild(delBtn);
      fileList.appendChild(li);
    });
  } catch (err) {
    fileList.innerHTML = '<li>المجلد فارغ أو لا يوجد وصول.</li>';
  }
}

// تحديث القائمة عند تغيير المستودع/المجلد
document.getElementById('repo').addEventListener('blur', () => {
  const repo = document.getElementById('repo').value;
  const folder = document.getElementById('folder').value;
  if (repo && folder) listFiles(repo, folder);
});
document.getElementById('folder').addEventListener('blur', () => {
  const repo = document.getElementById('repo').value;
  const folder = document.getElementById('folder').value;
  if (repo && folder) listFiles(repo, folder);
});
