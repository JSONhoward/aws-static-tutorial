import React, { useState, useEffect } from 'react';
import './App.css';
import { AmplifySignOut, withAuthenticator } from '@aws-amplify/ui-react'
import { listTodos } from './graphql/queries'
import { createTodo as createNoteMutation, deleteTodo as deleteNoteMutation } from './graphql/mutations'
import { API, Storage } from 'aws-amplify';


interface Note {
  id?: string,
  name: string,
  description?: string,
  image?: string | object
}
const initialFormState: Note = { name: '', description: '', }

function App() {
  const [notes, setNotes] = useState<Note[]>([])
  const [formData, setFormData] = useState(initialFormState)

  useEffect(() => {
    fetchNotes()
  }, [])

  async function onChange(e: any) {
    if (!e.target.files[0]) return

    const file = e.target.files[0]
    setFormData({ ...formData, image: file.name })
    await Storage.put(file.name, file)
    fetchNotes()
  }

  async function fetchNotes() {
    const apiData: any = await API.graphql({ query: listTodos })
    const notesFromAPI = apiData?.data?.listTodos?.items || []
    await Promise.all(notesFromAPI.map(async (note: Note) => {
      if (note.image) {
        const image = await Storage.get(note.image as string)
        note.image = image
      }
      return note
    }))
    setNotes(apiData?.data?.listTodos?.items || [])
  }

  async function createNote() {
    if (!formData.name || !formData.description) return;
    await API.graphql({ query: createNoteMutation, variables: { input: formData } });
    if (formData.image) {
      const image = await Storage.get(formData.image as string)
      formData.image = image
    }
    setNotes([...notes, formData]);
    setFormData(initialFormState);
  }

  async function deleteNote({ id }: any) {
    const newNotesArray = notes.filter(note => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } } });
  }

  return (
    <div className="App">
      <h1>My Notes App</h1>
      <input
        onChange={e => setFormData({ ...formData, 'name': e.target.value })}
        placeholder="Note name"
        value={formData.name}
      />
      <input
        onChange={e => setFormData({ ...formData, 'description': e.target.value })}
        placeholder="Note description"
        value={formData.description}
      />
      <input
        type='file'
        onChange={onChange}
      />
      <button onClick={createNote}>Create Note</button>
      <div style={{ marginBottom: 30 }}>
        {
          notes.map(note => (
            <div key={note.id || note.name}>
              <h2>{note.name}</h2>
              <p>{note.description}</p>
              <button onClick={() => deleteNote(note)}>Delete note</button>
              {
                note.image && <img src={note.image as string} alt={note.name} style={{width: 400}} />
              }
            </div>
          ))
        }
      </div>
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);
