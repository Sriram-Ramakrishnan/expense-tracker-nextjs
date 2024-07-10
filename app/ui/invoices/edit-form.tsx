'use client';
import { useFormState } from 'react-dom';
import { useState,useEffect } from 'react';
import { CustomerField, InvoiceForm } from '@/app/lib/definitions';
import {
  CheckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Button } from '@/app/ui/button';
import { State, updateInvoice } from '@/app/lib/actions';
import { fetchImageFromUrl } from '@/app/lib/actions';

export default function EditInvoiceForm({
  invoice,
  customers,
}: {
  invoice: InvoiceForm;
  customers: CustomerField[];
}) {
  const initialState = { message: null, errors: {} };
  const [file, setFile] = useState<File | null>(null);

  // Function to upload file as blob to the site from an URL
  async function uploadFileFromUrl(receipt_id: string) {
    try {
      const response = await fetchImageFromUrl(receipt_id);
      if(response){
        const blob = await response.blob();
        setFile(new File([blob], invoice.receipt_id, { type: blob.type }));
        console.log('File uploaded successfully');
      }
      
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }

  // Call the function to upload the file from the URL
  useEffect(() => {
    console.log("UseEffect block", invoice);
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
    console.log("Postgres submit block:");
    console.log(formData.get('receiptId'));
    const response = await updateInvoiceWithId(prevState, formData);
    return response;
  };
  const [state, dispatch] = useFormState(updateInvoiceWithId, initialState);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('customerId', e.currentTarget.customerId.value);
    formData.append('amount', e.currentTarget.amount.value);
    formData.append('status', e.currentTarget.status.value);
    if (!file){
      formData.append('receiptId', '');
    }else{
      const fileFormData = await handleFile(file);
      formData.append('receiptId', fileFormData.get('key') as string);
    }
    await submitForm(initialState, formData);
    console.log("Submit block ends");
  };
  
  return (
    <form action={dispatch}  onSubmit={handleSubmit}>
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
        </fieldset>

        {/* Invoice Receipr */}
        <div className='mb-4 mt-2'>
          <label htmlFor="customer" className="mb-2 block text-sm font-medium">
              Choose receipt if any
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="file"
                type="file"
                onChange={
                  (e) => {
                    const currfile = e.target.files?.[0];
                    if (currfile) {
                      setFile(currfile);
                    }
                  }}
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                accept="image/png, image/jpeg"/>
                {file && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium">Uploaded Receipt</label>
                    <img src={URL.createObjectURL(file)} alt="Uploaded Receipt" className="max-w-full h-auto" />
                  </div>
                )}
                
            </div>
          </div>
        </div>

      </div>
      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/invoices"
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Cancel
        </Link>
        <Button type="submit">Edit Invoice</Button>
      </div>
    </form>
  );
}

