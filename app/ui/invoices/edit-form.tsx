'use client';
import { useFormState } from 'react-dom';
import { useState,useEffect,useRef } from 'react';
import { CustomerField, InvoiceForm } from '@/app/lib/definitions';
import {
  CheckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserCircleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Button } from '@/app/ui/button';
import { State, updateInvoice, redirPage } from '@/app/lib/actions';
import { fetchS3ImgUrl } from '@/app/lib/actions';

import { toast, Bounce } from 'react-toastify';


export default function EditInvoiceForm({
  invoice,
  customers,
}: {
  invoice: InvoiceForm;
  customers: CustomerField[];
}) {
  const initialState = { message: null, errors: {} };
  const [file, setFile] = useState<File | null>(null);
  const [s3Url, setS3Url] = useState<string | null>(null);
  const receiptRef = useRef(null);

  // Function to upload file as blob to the site from an URL
  async function uploadFileFromUrl(receipt_id: string) {
    try {
      console.log("Receipt ID:",receipt_id);
      if(receipt_id !== null && receipt_id !== ''){
        const receipt_url = await fetchS3ImgUrl(receipt_id);
        console.log("URL:",receipt_url);
        if(receipt_url) setS3Url(receipt_url);
      }
    } catch (error) {
        console.error('Error uploading file:', error);
    }
  }
  // Call the function to upload the file from the URL
  useEffect(() => {
    uploadFileFromUrl(invoice.receipt_id);
  }, [invoice]);

  async function handleFile(file:File) {
    // File Upload block:
    const formData = new FormData();
    const response = await fetch(
      process.env.NEXT_PUBLIC_BASE_URL + '/api/upload',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      }
    )
    console.log("Response:");
    console.log(response);
  
    if (response.ok) {
      const { url, fields } = await response.json()
      console.log(fields);
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string)
      });
      formData.append('file', file);
      console.log(formData.get('file'));
      const uploadResponse = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      console.log(uploadResponse);
      if (uploadResponse.ok) {
        console.log('S3 Upload Success:', uploadResponse);
      } else {
        console.error('S3 Upload Error:', uploadResponse);
      }
    } else {
        console.error('S3 Upload Error: Failed to get pre-signed URL.')
    }
    return formData;
  }

  const updateInvoiceWithId = updateInvoice.bind(null, invoice.id);

  async function submitForm(prevState: State, formData: FormData) {
    if (!file){
      console.log("No file uploaded");
      if(invoice.receipt_id && s3Url){
        formData.append('receiptId', invoice.receipt_id);
      }else{
        formData.append('receiptId', '');
      }
    }else{
      const fileFormData = await handleFile(file);
      formData.append('receiptId', fileFormData.get('key') as string);
    }
    try {
      const response = await updateInvoiceWithId(prevState, formData);
      console.log("Response:",response);
      if(response.errors){
        return response;
      }
      toast.success("Invoice Updated",{
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
        });
      redirPage();
      return { message: 'Updated Invoice.' };
    } catch (error) {
      console.log("Error:",error);
      return { message: 'Database Error: Failed to Create Invoice.' };
    }
    
  };
  const [state, dispatch] = useFormState(submitForm, initialState);

  // useEffect for showing error message notification
  useEffect(() => {
    if (state.message) {
      toast.error("Fill all columns",{
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
        });
        state.message = null;
    }
  }, [state.message]);
  
  return (
    <form action={dispatch}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {/* Customer Name */}
        <div className="mb-4">
          <label htmlFor="customer" className="mb-2 block text-sm font-medium">
            Choose customer
          </label>
          <div className="relative">
            <select
              id="customer"
              name="customerId"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              defaultValue={invoice.customer_id}
            >
              <option value="" disabled>
                Select a customer
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <UserCircleIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" />
          </div>
          <div id="customer-error" aria-live="polite" aria-atomic="true">
              {state.errors?.customerId &&
                state.errors.customerId.map((error: string) => (
                  <p className="mt-4 text-sm text-red-500" key={error}>
                    {error}
                  </p>
                ))}
            </div>
        </div>

        {/* Invoice Amount */}
        <div className="mb-4">
          <label htmlFor="amount" className="mb-2 block text-sm font-medium">
            Choose an amount
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                defaultValue={invoice.amount}
                placeholder="Enter USD amount"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              />
              <CurrencyDollarIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            <div id="amount-error" aria-live="polite" aria-atomic="true">
              {state.errors?.amount &&
                state.errors.amount.map((error: string) => (
                  <p className="mt-4 text-sm text-red-500" key={error}>
                    {error}
                  </p>
                ))}
            </div>
          </div>
        </div>

        {/* Invoice Status */}
        <fieldset>
          <legend className="mb-2 block text-sm font-medium">
            Set the invoice status
          </legend>
          <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3">
            <div className="flex gap-4">
              <div className="flex items-center">
                <input
                  id="pending"
                  name="status"
                  type="radio"
                  value="pending"
                  defaultChecked={invoice.status === 'pending'}
                  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                />
                <label
                  htmlFor="pending"
                  className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600"
                >
                  Pending <ClockIcon className="h-4 w-4" />
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="paid"
                  name="status"
                  type="radio"
                  value="paid"
                  defaultChecked={invoice.status === 'paid'}
                  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                />
                <label
                  htmlFor="paid"
                  className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Paid <CheckIcon className="h-4 w-4" />
                </label>
              </div>
            </div>
          </div>
          <div id='status-error'>
              {state.errors?.status &&
                state.errors.status.map((error: string) => (
                  <p className="mt-4 text-sm text-red-500" key={error}>
                    {error}
                  </p>
              ))}
            </div>
        </fieldset>

        {/* Invoice Receipt */}
        <div className='mb-4 mt-2'>
          <label htmlFor="customer" className="mb-2 block text-sm font-medium">
              Choose receipt if any
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <div className='flex items-center justify-between'>
                <input
                id="file"
                type="file"
                ref={receiptRef}
                onChange={
                  (e) => {
                    const currfile = e.target.files?.[0];
                    if (currfile) {
                      setFile(currfile);
                      setS3Url(URL.createObjectURL(currfile));
                    }
                  }}
                className="peer block w-2/3 md:w-1/2 rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500 cursor-pointer"
                accept="image/png, image/jpeg"
                />
                <Button className=' bg-gray-500 hover:bg-red-500'
                  onClick={(e)=>{
                    e.preventDefault();
                    setFile(null);
                    setS3Url(null);
                    if(receiptRef.current)  (receiptRef.current as HTMLInputElement).value = '';
                  }}>Remove</Button>
              </div>
                {s3Url && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium">Uploaded Receipt</label>
                    <img src={s3Url} alt="Uploaded Receipt" className="max-w-full h-auto" />
                  </div>
                )}

                {!s3Url && (
                  <div className="mt-4 text-center">
                    <PhotoIcon className="h-16 w-16 mx-auto text-gray-400 md:h8 md:w-8" />
                    <label className="block text-sm font-medium">No Receipt uploaded</label>
                  </div>
                )}
                
            </div>
          </div>
        </div>

      </div>
      <div>
          {(state.message) &&
            <p className="mt-4 text-sm text-red-500" key={state.message}>
              {state.message}
            </p>
          }
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/invoices"
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Cancel
        </Link>
        <Button type="submit">Save Invoice</Button>
      </div>
    </form>
  );
}

